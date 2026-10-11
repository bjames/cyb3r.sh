import './style.css';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const controls = new Set(['top', 'bottom', 'size', 'color', 'outline', 'font', 'uppercase']);
let nextCaption = 1;
let frames = [], frameIndex = 0, timer, filename = 'meme', animated = false, busy = false;
const MAX_PIXELS = 4_000_000, MAX_FRAME_PIXELS = 40_000_000;
const boxes = {
  top: { x: .04, y: .04, w: .92, h: .25 },
  bottom: { x: .04, y: .71, w: .92, h: .25 },
};
const preview = document.createElement('div');
preview.className = 'preview';
canvas.before(preview); preview.append(canvas);
const overlays = {};
function createOverlay(id, name) {
  const box = document.createElement('div');
  box.className = 'caption-box'; box.tabIndex = 0;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', `${name} caption: drag to move; arrow keys move; Shift plus arrow keys resize`);
  const label = document.createElement('span'); label.textContent = name;
  const handle = document.createElement('span'); handle.className = 'resize-handle';
  handle.setAttribute('aria-hidden', 'true');
  box.append(label, handle); preview.append(box); overlays[id] = box;
  box.addEventListener('pointerdown', e => {
    if (busy || !frames.length || e.button !== 0) return;
    e.preventDefault(); box.focus(); box.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect(), start = { ...boxes[id] };
    const x = e.clientX, y = e.clientY, resizing = e.target === handle;
    function move(event) {
      if (busy) return;
      const dx = (event.clientX - x) / rect.width, dy = (event.clientY - y) / rect.height;
      if (resizing) {
        boxes[id].w = clamp(start.w + dx, .1, 1 - start.x);
        boxes[id].h = clamp(start.h + dy, .06, 1 - start.y);
      } else {
        boxes[id].x = clamp(start.x + dx, 0, 1 - start.w);
        boxes[id].y = clamp(start.y + dy, 0, 1 - start.h);
      }
      render();
    }
    function end() {
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerup', end);
      box.removeEventListener('pointercancel', end);
      box.removeEventListener('lostpointercapture', end);
    }
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    box.addEventListener('lostpointercapture', end);
  });
  box.addEventListener('keydown', e => {
    if (busy || !frames.length || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const b = boxes[id], horizontal = ['ArrowLeft', 'ArrowRight'].includes(e.key);
    const delta = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -.01 : .01;
    const axis = e.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    const min = e.shiftKey ? (horizontal ? .1 : .06) : 0;
    const max = e.shiftKey ? 1 - b[horizontal ? 'x' : 'y'] : 1 - b[horizontal ? 'w' : 'h'];
    b[axis] = clamp(b[axis] + delta, min, max); render();
  });
}
createOverlay('top', 'Top text');
createOverlay('bottom', 'Bottom text');
$('add-caption').addEventListener('click', () => {
  if (busy) return;
  const number = nextCaption++, id = `caption-${number}`, name = `Text box ${number}`;
  const offset = ((number - 1) % 5) * .025;
  boxes[id] = { x: .15 + offset, y: .375 + offset, w: .7, h: .25 };
  const editor = document.createElement('div'); editor.className = 'extra-caption';
  const heading = document.createElement('div'); heading.className = 'row';
  const label = document.createElement('label'); label.htmlFor = id; label.textContent = name;
  const remove = document.createElement('button'); remove.type = 'button';
  remove.className = 'remove-caption'; remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove ${name.toLowerCase()}`);
  const input = document.createElement('textarea'); input.id = id; input.rows = 2;
  input.placeholder = 'Add another punchline…';
  input.addEventListener('input', () => { if (!busy) render(); });
  heading.append(label, remove); editor.append(heading, input); $('extra-captions').append(editor);
  controls.add(id); createOverlay(id, name);
  remove.addEventListener('click', () => {
    if (busy) return;
    overlays[id].remove(); delete overlays[id]; delete boxes[id]; controls.delete(id);
    editor.remove(); render(); $('add-caption').focus();
  });
  syncBoxes(); render(); input.focus();
});
function setEditingDisabled(disabled) {
  controls.forEach(id => $(id).disabled = disabled);
  $('add-caption').disabled = disabled;
  document.querySelectorAll('.freeeme .remove-caption').forEach(button => button.disabled = disabled);
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function syncBoxes() {
  for (const id of Object.keys(boxes)) {
    const b = boxes[id], el = overlays[id];
    el.hidden = !frames.length || busy;
    Object.assign(el.style, { left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });
  }
}
syncBoxes();
function status(message, visible = false) {
  let liveStatus = $('status');
  if (!liveStatus) {
    liveStatus = document.createElement('p'); liveStatus.id = 'status';
    liveStatus.className = 'visually-hidden'; liveStatus.setAttribute('role', 'status');
    liveStatus.setAttribute('aria-live', 'polite'); $('save').after(liveStatus);
  }
  liveStatus.classList.toggle('visually-hidden', !visible);
  liveStatus.textContent = message;
}
function wrap(text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line.trim());
  }
  return lines;
}
function caption(text, id) {
  if (!text.trim()) return;
  if ($('uppercase').checked) text = text.toUpperCase();
  const b = boxes[id], width = b.w * canvas.width * .96, height = b.h * canvas.height * .94;
  let size = Math.max(1, canvas.width * Number($('size').value) / 100), lines;
  // Fit whole words within the resized box without splitting them.
  do {
    ctx.font = `900 ${size}px ${$('font').value}`;
    lines = wrap(text, width);
    if (lines.length * size * 1.12 <= height && lines.every(line => ctx.measureText(line).width <= width)) break;
    size -= 1;
  } while (size > 1);
  size = Math.max(1, size);
  ctx.font = `900 ${size}px ${$('font').value}`;
  lines = wrap(text, width);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  ctx.fillStyle = $('color').value; ctx.strokeStyle = $('outline').value;
  ctx.lineWidth = Math.max(2, size * .075);
  const lineHeight = size * 1.12;
  const x = (b.x + b.w / 2) * canvas.width;
  const y = b.y * canvas.height + (b.h * canvas.height - lines.length * lineHeight) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height); ctx.clip();
  lines.forEach((line, i) => { ctx.strokeText(line, x, y + i * lineHeight); ctx.fillText(line, x, y + i * lineHeight); });
  ctx.restore();
}
function render(index = frameIndex) {
  if (!frames.length) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frames[index].image, 0, 0);
  for (const id of Object.keys(boxes)) caption($(id).value, id);
  syncBoxes();
}
function play() {
  clearTimeout(timer); render();
  if (animated && !busy) timer = setTimeout(() => { frameIndex = (frameIndex + 1) % frames.length; play(); }, frames[frameIndex].delay);
}
function surface(width, height) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
async function loadStillImage(file) {
  // HTMLImageElement is supported by older mobile browsers too, unlike createImageBitmap.
  const url = URL.createObjectURL(file), source = new Image();
  try {
    await new Promise((resolve, reject) => {
      source.onload = resolve;
      source.onerror = () => reject(Error('This image could not be decoded. Try a PNG, JPEG, or WebP; convert HEIC/HEIF photos to JPEG first.'));
      source.src = url;
    });
    const width = source.naturalWidth, height = source.naturalHeight;
    if (!width || !height) throw Error('This image has no usable dimensions.');
    const scale = Math.min(1, 2048 / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
    const image = surface(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)));
    const context = image.getContext('2d');
    if (!context) throw Error('Not enough memory to open this image. Try a smaller photo.');
    context.drawImage(source, 0, 0, image.width, image.height);
    return { image, resized: scale < 1 };
  } finally { source.src = ''; URL.revokeObjectURL(url); }
}
async function load(file) {
  if (!file || busy) return;
  busy = true; $('save').disabled = true;
  try {
    if (file.size > 25 * 1024 * 1024) throw Error('Please choose a file under 25 MB.');
    status('Opening locally…');
    const bytes = await file.arrayBuffer();
    const isGif = new TextDecoder().decode(bytes.slice(0, 6)).startsWith('GIF8');
    let nextFrames, width, height, resized = false;
    if (isGif) {
      const gif = parseGIF(bytes); width = gif.lsd.width; height = gif.lsd.height;
      const count = gif.frames.filter(f => f.image).length;
      if (width * height > MAX_PIXELS || width * height * count > MAX_FRAME_PIXELS) throw Error('This GIF is too large to edit safely. Try a smaller or shorter GIF.');
      const decoded = decompressFrames(gif, true);
      if (!decoded.length) throw Error('No frames found in this GIF.');
      const composite = surface(width, height), c = composite.getContext('2d');
      nextFrames = [];
      for (const f of decoded) {
        const before = f.disposalType === 3 ? c.getImageData(0, 0, width, height) : null;
        const patch = surface(f.dims.width, f.dims.height);
        patch.getContext('2d').putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
        c.drawImage(patch, f.dims.left, f.dims.top);
        const image = surface(width, height), ic = image.getContext('2d');
        // GIF export uses an opaque white background for predictable quantization.
        ic.fillStyle = '#fff'; ic.fillRect(0, 0, width, height); ic.drawImage(composite, 0, 0);
        nextFrames.push({ image, delay: Math.max(20, f.delay || 100) });
        if (f.disposalType === 2) c.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
        if (before) c.putImageData(before, 0, 0);
      }
    } else {
      // Some phone file pickers omit MIME types; let the browser decoder decide.
      if (file.type && !file.type.startsWith('image/')) throw Error('Choose an image: PNG, JPEG, WebP, or GIF.');
      const loaded = await loadStillImage(file);
      const image = loaded.image; resized = loaded.resized;
      width = image.width; height = image.height;
      nextFrames = [{ image, delay: 100 }];
    }
    clearTimeout(timer);
    for (const frame of frames) frame.image.close?.();
    frames = nextFrames; frameIndex = 0; animated = isGif && frames.length > 1;
    canvas.width = width; canvas.height = height; canvas.hidden = false; $('empty').hidden = true;
    filename = file.name.replace(/\.[^.]+$/, '') || 'meme';
    if ($('fileinfo')) $('fileinfo').textContent = `${file.name} · ${width} × ${height}${animated ? ` · ${frames.length} frames` : ''}`;
    status(resized ? `Photo resized locally to ${width} × ${height} for reliable editing and downloads.` : animated ? 'Animated GIF ready. Downloads keep the animation; transparency becomes white.' : 'Ready to add your punchline.', resized);
  } catch (e) { status(e.message || 'Could not open that image.', true); }
  finally { busy = false; $('save').disabled = !frames.length; play(); }
}
$('choose').onclick = $('replace').onclick = () => { if (!busy) $('file').click(); };
$('file').onchange = () => { load($('file').files[0]); $('file').value = ''; };
controls.forEach(id => $(id).addEventListener('input', () => { $('sizeValue').value = `${$('size').value}%`; if (!busy) render(); }));
['dragenter', 'dragover'].forEach(event => $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.add('drag'); }));
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('drag'));
$('dropzone').addEventListener('drop', e => { e.preventDefault(); $('dropzone').classList.remove('drag'); load(e.dataTransfer.files[0]); });
// Prevent accidental navigation when a file misses the drop target.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
$('save').onclick = async () => {
  if (busy || !frames.length) return;
  busy = true; clearTimeout(timer); $('save').disabled = true; syncBoxes();
  setEditingDisabled(true);
  try {
    let blob;
    if (animated) {
      const encoder = GIFEncoder();
      for (let i = 0; i < frames.length; i++) {
        status(`Encoding GIF locally… ${i + 1}/${frames.length}`);
        await new Promise(resolve => setTimeout(resolve, 0));
        render(i);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const palette = quantize(rgba, 256);
        encoder.writeFrame(applyPalette(rgba, palette), canvas.width, canvas.height, { palette, delay: frames[i].delay, repeat: 0 });
      }
      encoder.finish(); blob = new Blob([encoder.bytes()], { type: 'image/gif' });
    } else { render(); blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
    if (!blob) throw Error('Export failed. Try a smaller image.');
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${filename}-freeeme.${animated ? 'gif' : 'png'}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    status('Download ready. No files left your device.');
  } catch (e) { status(`Could not export: ${e.message}`, true); }
  finally { busy = false; $('save').disabled = false; setEditingDisabled(false); play(); }
};
