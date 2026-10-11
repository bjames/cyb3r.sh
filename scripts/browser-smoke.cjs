const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const server = http.createServer((req, res) => {
  const file = path.join(site, new URL(req.url, 'http://localhost').pathname);
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css'}[path.extname(file)] || 'application/octet-stream';
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, {'Content-Type':mime}); res.end(error ? 'Missing' : data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),
    headless:true,
  });
  const page = await browser.newPage({viewport:{width:1280, height:1000}});
  const errors = [], missing = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
  page.on('response', r => { if(r.status() >= 400) missing.push(r.url()); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const width of [1280, 1000, 800, 390]) {
    await page.setViewportSize({width, height:1000});
    await page.goto(base + '/gpx-treadmill.html');
    const sharedNav = await page.locator('.title-links').boundingBox();
    await page.goto(base + '/freeeme.html');
    const memeNav = await page.locator('.title-links').boundingBox();
    const editor = await page.locator('.freeeme').boundingBox();
    const body = await page.locator('body').boundingBox();
    assert(Math.abs(editor.x - body.x) < 1 && Math.abs(editor.width - body.width) < 1, `Editor exceeds shared content width at ${width}px`);
    for (const dimension of ['x', 'width', 'height']) {
      assert(Math.abs(sharedNav[dimension] - memeNav[dimension]) < 1, `Navigation ${dimension} changed at ${width}px`);
    }
  }
  await page.setViewportSize({width:1280, height:1000});
  await page.goto(base + '/freeeme.html');
  assert.deepEqual(await page.locator('.title-links a').allTextContents(), ['index','about','tools','dash']);
  const png = await page.evaluate(() => { const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#6699bb';x.fillRect(0,0,640,480);return c.toDataURL().split(',')[1]; });
  await page.locator('#file').setInputFiles({name:'test.png', mimeType:'image/png', buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(() => !document.querySelector('#save').disabled);
  await page.locator('#top').fill('WORDS STAY TOGETHER');
  await page.locator('#bottom').fill('LOCAL MEMES');
  const box = page.locator('.caption-box').first();
  await box.scrollIntoViewIfNeeded();
  const original = await box.boundingBox();
  await page.mouse.move(original.x+original.width/2,original.y+original.height/2);
  await page.mouse.down();await page.mouse.move(original.x+original.width/2+20,original.y+original.height/2+40);await page.mouse.up();
  const moved = await box.boundingBox();assert(moved.y > original.y + 30);
  const handle=await box.locator('.resize-handle').boundingBox();
  await page.mouse.move(handle.x+9,handle.y+9);await page.mouse.down();await page.mouse.move(handle.x-50,handle.y+35);await page.mouse.up();
  const resized=await box.boundingBox();assert(resized.width < moved.width-30);assert(resized.height > moved.height+20);
  await box.focus();await page.keyboard.press('ArrowDown');assert((await box.boundingBox()).y > resized.y);
  const beforeExtra = await page.locator('#canvas').evaluate(c => c.toDataURL());
  await page.locator('#add-caption').click();
  await page.locator('#caption-1').fill('ANOTHER PUNCHLINE');
  assert.equal(await page.locator('.caption-box').count(), 3);
  const extraBox = page.locator('.caption-box').last();
  const extraOriginal = await extraBox.boundingBox();
  await extraBox.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Shift+ArrowLeft');
  const extraMoved = await extraBox.boundingBox();
  assert(extraMoved.y > extraOriginal.y); assert(extraMoved.width < extraOriginal.width);
  assert.notEqual(await page.locator('#canvas').evaluate(c => c.toDataURL()), beforeExtra);
  await page.locator('#add-caption').click();
  await page.locator('#caption-2').fill('DELETE ME');
  await page.getByRole('button', {name:'Remove text box 2', exact:true}).click();
  assert.equal(await page.locator('#caption-2').count(), 0);
  assert.equal(await page.locator('.caption-box').count(), 3);
  const expectedPng = await page.locator('#canvas').evaluate(c => c.toDataURL().split(',')[1]);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save').click()]);
  const output=await download.path();assert.equal(fs.readFileSync(output).subarray(1,4).toString(),'PNG');
  assert.deepEqual(fs.readFileSync(output), Buffer.from(expectedPng, 'base64')); // Extra caption exports; overlay UI does not.
  assert(await box.isVisible());
  for (const scheme of ['light','dark']) {
    await page.emulateMedia({colorScheme:scheme});
    const accent=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim());
    assert.equal(accent, scheme==='light'?'#6200ea':'#bd93f9');
  }
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({path:path.join(require('os').tmpdir(),'freeeme-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:1000});
  // Exercise GIF decoding and animated export with two generated local frames.
  const {GIFEncoder,quantize,applyPalette}=require(root+'/src/tools/freeeme/app/node_modules/gifenc');
  const enc=GIFEncoder();
  for(const color of [[255,0,0],[0,0,255]]) {
    const pixels=new Uint8Array(64*48*4);for(let i=0;i<pixels.length;i+=4){pixels.set([...color,255],i);}
    const palette=quantize(pixels,256);enc.writeFrame(applyPalette(pixels,palette),64,48,{palette,delay:100,repeat:0});
  }
  enc.finish();
  await page.locator('#file').setInputFiles({name:'test.gif',mimeType:'image/gif',buffer:Buffer.from(enc.bytes())});
  await page.waitForFunction(()=>document.querySelector('#canvas').width === 64 && !document.querySelector('#save').disabled);
  const [gifDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#save').click()]);
  const gifBytes=fs.readFileSync(await gifDownload.path());assert.equal(gifBytes.subarray(0,6).toString(),'GIF89a');
  const {parseGIF,decompressFrames}=require(root+'/src/tools/freeeme/app/node_modules/gifuct-js');
  const decoded=decompressFrames(parseGIF(gifBytes.buffer.slice(gifBytes.byteOffset,gifBytes.byteOffset+gifBytes.byteLength)),true);
  assert.equal(decoded.length,2);
  await page.goto(base+'/gpx-treadmill.html');
  await page.locator('#gpx-file').setInputFiles({name:'route.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from('<?xml version="1.0"?><gpx version="1.1" creator="test"><trk><name>Test route</name><trkseg>'+[0,1,2,3,4,5].map(i=>`<trkpt lat="40.${String(i*100).padStart(4,'0')}" lon="-105.0"><ele>${1500+i*10}</ele></trkpt>`).join('')+'</trkseg></trk></gpx>')});
  await page.waitForFunction(()=>document.querySelector('#upload-status').textContent.includes('Test route'));
  await page.locator('#share-link-btn').click();
  const sharedLink = await page.locator('#share-link-input').inputValue();
  assert(sharedLink.includes('route='));
  await page.goto(sharedLink);
  await page.waitForFunction(()=>document.querySelector('#upload-status').textContent.includes('Shared'));
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));
  console.log('PASS: shared navigation and consistent width at four breakpoints, PNG upload/export, caption drag/resize/keyboard, additional captions and removal, light/dark theme, mobile layout, animated GIF round-trip, GPX upload and shared-route URL; no browser errors or missing assets.');
  await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
