---
title: 'Freeeme'
lang: en
...

```{=html}
<div class="freeeme">
<p class="intro">Upload an image or GIF and add text. Everything happens locally, in your browser. No data is stored on my server.</p>
<div class="workspace">
<section class="stage" id="dropzone" aria-label="Image upload and preview">
<div id="empty">
<div class="upload-icon">↥</div>
<h2>Upload an image or animated GIF</h2>
<button id="choose" type="button">Choose a file</button>
<small>PNG, JPEG, WebP, GIF · up to 25 MB</small>
</div>
<canvas id="canvas" hidden aria-label="Meme preview"></canvas>
</section>
<aside>
<p class="editor-help">Drag boxes on the preview to move them. Drag the right corner to resize. Keyboard: arrows move, Shift + arrows resize.</p>
<label for="top">TOP TEXT</label>
<textarea id="top" rows="2" placeholder="TFW I DON'T STORE YOUR FILES"></textarea>
<label for="bottom">BOTTOM TEXT</label>
<textarea id="bottom" rows="2" placeholder="OR ADD WATERMARKS"></textarea>
<div id="extra-captions"></div>
<button id="add-caption" class="secondary" type="button">+ Add text box</button>
<div class="row"><label for="size">TEXT SIZE</label><output id="sizeValue">8%</output></div>
<input id="size" type="range" min="3" max="18" value="8">
<div class="row controls">
<div><label for="color">TEXT</label><input type="color" id="color" value="#ffffff"></div>
<div><label for="outline">OUTLINE</label><input type="color" id="outline" value="#000000"></div>
<div><label for="font">FONT</label><select id="font"><option value="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif">Classic</option><option value="Arial, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option></select></div>
</div>
<label class="check"><input type="checkbox" id="uppercase" checked> ALL CAPS</label>
<button id="save" type="button" disabled>Download meme <span>↓</span></button>
<button class="secondary" id="replace" type="button">Change image</button>
</aside>
</div>
<input id="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
</div>
```
