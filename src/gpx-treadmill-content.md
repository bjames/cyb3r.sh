---
title: 'GPX to Treadmill'
lang: en
...

<div class="gpx-tool">

<p class="gpx-tool__subtitle">Convert your outdoor routes to treadmill incline settings</p>

<div class="gpx-tool__controls">
<div class="unit-toggle" id="unit-toggle">
<button type="button" class="unit-toggle__btn unit-toggle__btn--active" data-unit="metric" id="unit-metric">
Metric
</button>
<button type="button" class="unit-toggle__btn" data-unit="imperial" id="unit-imperial">
Imperial
</button>
</div>
</div>

<!-- Step 1: File Upload -->
<section class="section" id="upload-section">
<h2 class="section__title">1. Upload GPX File</h2>
<div class="upload-area" id="upload-area">
<input type="file" id="gpx-file" accept=".gpx" class="upload-area__input">
<label for="gpx-file" class="upload-area__label">
<span class="upload-area__icon">📁</span>
<span class="upload-area__text">Click to select or drag a GPX file here</span>
</label>
</div>
<p class="upload-status" id="upload-status"></p>
<div class="share-link" id="share-link" style="display: none;">
<div class="share-link__controls">
<input type="text" id="share-link-name" class="share-link__name" placeholder="Route name (optional)">
<button type="button" id="share-link-btn" class="btn btn--secondary btn--small">Generate Shareable Link</button>
</div>
<p class="share-link__note">The elevation profile will be smoothed to 100m intervals to fit in the URL. Smoothing also impacts elevation gain/loss. No data is stored on the server.</p>
<div id="share-link-container" class="share-link__output" style="display: none;">
<input id="share-link-input" class="share-link__input" readonly>
<button type="button" id="share-link-copy" class="btn btn--secondary btn--small">Copy</button>
</div>
</div>
</section>

<!-- Step 2: Treadmill Settings -->
<section class="section section--disabled" id="settings-section">
<h2 class="section__title">2. Treadmill Settings</h2>
<div class="settings-grid">
<div class="form-group">
<label for="min-incline" class="form-group__label">Minimum Incline (%)</label>
<input type="number" id="min-incline" class="form-group__input"
value="-3" min="-15" max="0" step="0.5">
<span class="form-group__hint">Most treadmills: -3% to 0%</span>
</div>
<div class="form-group">
<label for="max-incline" class="form-group__label">Maximum Incline (%)</label>
<input type="number" id="max-incline" class="form-group__input"
value="12" min="0" max="40" step="0.5">
<span class="form-group__hint">Most treadmills: 12% to 15%</span>
</div>
<div class="form-group">
<label for="incline-step" class="form-group__label">Incline Step (%)</label>
<input type="number" id="incline-step" class="form-group__input"
value="0.5" min="0.5" max="5" step="0.5">
<span class="form-group__hint">Treadmill incline precision</span>
</div>
<div class="form-group">
<label for="interval-distance" class="form-group__label">Interval Distance</label>
<select id="interval-distance" class="form-group__select">
<option value="0.1">100 meters</option>
<option value="0.5" selected>500 meters</option>
<option value="1">1 kilometer</option>
</select>
<span class="form-group__hint">How often to change incline settings</span>
</div>
</div>
</section>

<!-- Step 3: Elevation Profile -->
<section class="section section--disabled" id="profile-section">
<h2 class="section__title">3. Select Route Section</h2>
<p class="section__description">Click and drag on the chart to select a portion of the route, or use the full route.</p>
<div class="profile-container">
<canvas id="elevation-canvas" class="profile-container__canvas"></canvas>
<div class="profile-info" id="profile-info">
<span id="selection-info">Full route selected</span>
<button type="button" id="clear-selection" class="btn btn--small btn--secondary" style="display: none;">Clear Selection</button>
</div>
</div>
<div class="waypoint-selector" id="waypoint-selector" style="display: none;">
<div class="waypoint-selector__header">
<span class="waypoint-selector__title">Quick Select by Waypoints</span>
</div>
<div class="waypoint-selector__controls">
<div class="waypoint-selector__field">
<label for="waypoint-start" class="waypoint-selector__label">Start</label>
<select id="waypoint-start" class="form-group__select waypoint-selector__select">
<option value="">Route Start</option>
</select>
</div>
<div class="waypoint-selector__field">
<label for="waypoint-end" class="waypoint-selector__label">End</label>
<select id="waypoint-end" class="form-group__select waypoint-selector__select">
<option value="">Route End</option>
</select>
</div>
<button type="button" id="waypoint-apply" class="btn btn--primary btn--small">Apply</button>
</div>
</div>
<div class="profile-stats" id="profile-stats">
<div class="stat">
<span class="stat__label">Distance</span>
<span class="stat__value" id="stat-distance">--</span>
</div>
<div class="stat">
<span class="stat__label">Elevation Gain</span>
<span class="stat__value" id="stat-gain">--</span>
</div>
<div class="stat">
<span class="stat__label">Elevation Loss</span>
<span class="stat__value" id="stat-loss">--</span>
</div>
<div class="stat">
<span class="stat__label">Min Elevation</span>
<span class="stat__value" id="stat-min-elev">--</span>
</div>
<div class="stat">
<span class="stat__label">Max Elevation</span>
<span class="stat__value" id="stat-max-elev">--</span>
</div>
</div>
</section>

<!-- Step 4: Generate Results -->
<section class="section section--disabled" id="generate-section">
<h2 class="section__title">4. Generate Treadmill Plan</h2>
<div class="generate-options">
<button type="button" id="generate-btn" class="btn btn--primary btn--large">Generate Intervals</button>
<label class="generate-option">
<input type="checkbox" id="out-and-back">
<span>Out and Back</span>
</label>
<label class="generate-option">
<input type="number" id="repeats" class="form-group__input generate-option__input" value="1" min="1" max="20" step="1">
<span>Repeats</span>
</label>
</div>
</section>

<!-- Results -->
<section class="section section--disabled" id="results-section">
<h2 class="section__title">Treadmill Settings</h2>
<div class="results-summary" id="results-summary"></div>
<div class="results-actions">
<button type="button" id="copy-btn" class="btn btn--secondary">Copy to Clipboard</button>
<button type="button" id="download-btn" class="btn btn--secondary">Download CSV</button>
</div>
<div class="table-container">
<table class="results-table" id="results-table">
<thead>
<tr>
<th>Start</th>
<th>End</th>
<th>Incline %</th>
<th>Elev Change</th>
<th>Cumul. Dist</th>
<th title="Cumulative elevation gain on treadmill. Difference from actual course shown in parentheses.">Treadmill Gain</th>
<th title="Cumulative elevation loss on treadmill. Difference from actual course shown in parentheses.">Treadmill Loss</th>
</tr>
</thead>
<tbody id="results-tbody">
</tbody>
</table>
</div>
</section>

</div>

<script src="gpx-treadmill-js/gpxParser.js"></script>
<script src="gpx-treadmill-js/unitConverter.js"></script>
<script src="gpx-treadmill-js/themeManager.js"></script>
<script src="gpx-treadmill-js/elevationProfile.js"></script>
<script src="gpx-treadmill-js/intervalCalculator.js"></script>
<script src="gpx-treadmill-js/tableRenderer.js"></script>
<script src="gpx-treadmill-js/linkGenerator.js"></script>
<script src="gpx-treadmill-js/main.js"></script>
