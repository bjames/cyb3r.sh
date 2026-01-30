/**
 * Main Application Module
 * Coordinates all modules and handles UI interactions
 */
(function() {
    'use strict';

    // Interval distance options per unit system (values in km)
    const intervalOptions = {
        metric: [
            { value: '0.1', label: '100 meters' },
            { value: '0.5', label: '500 meters', default: true },
            { value: '1', label: '1 kilometer' }
        ],
        imperial: [
            { value: '0.1609', label: '0.1 miles' },
            { value: '0.402', label: '0.25 miles', default: true },
            { value: '0.805', label: '0.5 miles' },
            { value: '1.609', label: '1 mile' }
        ]
    };

    // Application state
    const state = {
        gpxData: null,
        elevationData: null,
        waypoints: null,
        selection: null,
        intervals: null
    };

    // DOM elements
    const elements = {
        // Upload
        uploadArea: null,
        gpxFileInput: null,
        uploadStatus: null,

        // Settings
        settingsSection: null,
        minIncline: null,
        maxIncline: null,
        inclineStep: null,
        intervalDistance: null,

        // Profile
        profileSection: null,
        elevationCanvas: null,
        selectionInfo: null,
        clearSelectionBtn: null,
        waypointSelector: null,
        waypointStartSelect: null,
        waypointEndSelect: null,
        waypointApplyBtn: null,
        statDistance: null,
        statGain: null,
        statLoss: null,
        statMinElev: null,
        statMaxElev: null,

        // Generate
        generateSection: null,
        generateBtn: null,
        outAndBackCheckbox: null,
        repeatsInput: null,

        // Results
        resultsSection: null,
        resultsSummary: null,
        resultsTable: null,
        resultsTbody: null,
        copyBtn: null,
        downloadBtn: null,

        // Unit toggle
        unitMetricBtn: null,
        unitImperialBtn: null,

        // Share link
        shareLink: null,
        shareLinkBtn: null,
        shareLinkContainer: null,
        shareLinkName: null,
        shareLinkInput: null,
        shareLinkCopy: null
    };

    /**
     * Initializes the application
     */
    function init() {
        cacheElements();
        bindEvents();
        initModules();
        initUnitToggle();
        ThemeManager.onChange(handleThemeChange);
        loadSharedRoute();
    }

    /**
     * Caches DOM element references
     */
    function cacheElements() {
        elements.uploadArea = document.getElementById('upload-area');
        elements.gpxFileInput = document.getElementById('gpx-file');
        elements.uploadStatus = document.getElementById('upload-status');

        elements.settingsSection = document.getElementById('settings-section');
        elements.minIncline = document.getElementById('min-incline');
        elements.maxIncline = document.getElementById('max-incline');
        elements.inclineStep = document.getElementById('incline-step');
        elements.intervalDistance = document.getElementById('interval-distance');

        elements.profileSection = document.getElementById('profile-section');
        elements.elevationCanvas = document.getElementById('elevation-canvas');
        elements.selectionInfo = document.getElementById('selection-info');
        elements.clearSelectionBtn = document.getElementById('clear-selection');
        elements.waypointSelector = document.getElementById('waypoint-selector');
        elements.waypointStartSelect = document.getElementById('waypoint-start');
        elements.waypointEndSelect = document.getElementById('waypoint-end');
        elements.waypointApplyBtn = document.getElementById('waypoint-apply');
        elements.statDistance = document.getElementById('stat-distance');
        elements.statGain = document.getElementById('stat-gain');
        elements.statLoss = document.getElementById('stat-loss');
        elements.statMinElev = document.getElementById('stat-min-elev');
        elements.statMaxElev = document.getElementById('stat-max-elev');

        elements.generateSection = document.getElementById('generate-section');
        elements.generateBtn = document.getElementById('generate-btn');
        elements.outAndBackCheckbox = document.getElementById('out-and-back');
        elements.repeatsInput = document.getElementById('repeats');

        elements.resultsSection = document.getElementById('results-section');
        elements.resultsSummary = document.getElementById('results-summary');
        elements.resultsTable = document.getElementById('results-table');
        elements.resultsTbody = document.getElementById('results-tbody');
        elements.copyBtn = document.getElementById('copy-btn');
        elements.downloadBtn = document.getElementById('download-btn');

        elements.unitMetricBtn = document.getElementById('unit-metric');
        elements.unitImperialBtn = document.getElementById('unit-imperial');

        elements.shareLink = document.getElementById('share-link');
        elements.shareLinkBtn = document.getElementById('share-link-btn');
        elements.shareLinkName = document.getElementById('share-link-name');
        elements.shareLinkContainer = document.getElementById('share-link-container');
        elements.shareLinkInput = document.getElementById('share-link-input');
        elements.shareLinkCopy = document.getElementById('share-link-copy');
    }

    /**
     * Binds event handlers
     */
    function bindEvents() {
        // File upload
        elements.gpxFileInput.addEventListener('change', handleFileSelect);
        elements.uploadArea.addEventListener('dragover', handleDragOver);
        elements.uploadArea.addEventListener('dragleave', handleDragLeave);
        elements.uploadArea.addEventListener('drop', handleDrop);

        // Settings changes
        elements.minIncline.addEventListener('change', validateSettings);
        elements.maxIncline.addEventListener('change', validateSettings);
        elements.inclineStep.addEventListener('change', validateSettings);

        // Clear selection
        elements.clearSelectionBtn.addEventListener('click', handleClearSelection);

        // Waypoint selection
        elements.waypointApplyBtn.addEventListener('click', handleWaypointSelection);

        // Generate
        elements.generateBtn.addEventListener('click', handleGenerate);

        // Export
        elements.copyBtn.addEventListener('click', handleCopy);
        elements.downloadBtn.addEventListener('click', handleDownload);

        // Unit toggle
        elements.unitMetricBtn.addEventListener('click', function() {
            UnitConverter.setSystem('metric');
        });
        elements.unitImperialBtn.addEventListener('click', function() {
            UnitConverter.setSystem('imperial');
        });

        // Share link
        elements.shareLinkBtn.addEventListener('click', handleGenerateLink);
        elements.shareLinkCopy.addEventListener('click', handleCopyLink);
    }

    /**
     * Initializes sub-modules
     */
    function initModules() {
        ElevationProfile.init(elements.elevationCanvas, handleSelectionChange);
        TableRenderer.init(elements.resultsTbody, elements.resultsSummary);
    }

    /**
     * Initializes the unit toggle based on saved preference
     */
    function initUnitToggle() {
        var system = UnitConverter.getSystem();
        updateUnitToggleUI(system);
        updateIntervalOptions(system);

        // Listen for unit changes
        UnitConverter.onChange(handleUnitChange);
    }

    /**
     * Rebuilds the interval distance dropdown for the given unit system
     * @param {string} system - 'metric' or 'imperial'
     */
    function updateIntervalOptions(system) {
        var options = intervalOptions[system];
        var select = elements.intervalDistance;
        select.innerHTML = '';
        options.forEach(function(opt) {
            var el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            if (opt.default) el.selected = true;
            select.appendChild(el);
        });
    }

    /**
     * Updates the unit toggle button UI
     * @param {string} system - 'metric' or 'imperial'
     */
    function updateUnitToggleUI(system) {
        if (system === 'metric') {
            elements.unitMetricBtn.classList.add('unit-toggle__btn--active');
            elements.unitImperialBtn.classList.remove('unit-toggle__btn--active');
        } else {
            elements.unitMetricBtn.classList.remove('unit-toggle__btn--active');
            elements.unitImperialBtn.classList.add('unit-toggle__btn--active');
        }
    }

    /**
     * Handles unit system change
     * @param {string} system - 'metric' or 'imperial'
     */
    function handleUnitChange(system) {
        // Update button UI
        updateUnitToggleUI(system);

        // Update interval distance dropdown
        updateIntervalOptions(system);

        // Update stats display
        if (state.elevationData) {
            updateStats();
            updateSelectionInfo();
            updateWaypointSelector();
        }

        // Update elevation profile
        ElevationProfile.render();

        // Re-render table if intervals exist
        if (state.intervals && state.intervals.length > 0) {
            TableRenderer.render(state.intervals);
        }
    }

    /**
     * Handles theme change - re-renders canvas with new colors
     */
    function handleThemeChange() {
        ElevationProfile.render();
    }

    /**
     * Updates the selection info display
     */
    function updateSelectionInfo() {
        if (state.selection) {
            const dist = state.selection.endDistance - state.selection.startDistance;
            elements.selectionInfo.textContent =
                'Selected: ' + UnitConverter.formatDistance(state.selection.startDistance) +
                ' - ' + UnitConverter.formatDistance(state.selection.endDistance) +
                ' (' + UnitConverter.formatDistance(dist) + ')';
        } else {
            elements.selectionInfo.textContent = 'Full route selected';
        }
    }

    /**
     * Handles file selection
     * @param {Event} event - Change event
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    /**
     * Handles drag over
     * @param {DragEvent} event - Drag event
     */
    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.uploadArea.classList.add('upload-area--dragover');
    }

    /**
     * Handles drag leave
     * @param {DragEvent} event - Drag event
     */
    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.uploadArea.classList.remove('upload-area--dragover');
    }

    /**
     * Handles file drop
     * @param {DragEvent} event - Drop event
     */
    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        elements.uploadArea.classList.remove('upload-area--dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Processes an uploaded GPX file
     * @param {File} file - The uploaded file
     */
    function processFile(file) {
        // Check file type
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            showUploadError('Please select a GPX file');
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const gpxString = e.target.result;
                state.gpxData = GPXParser.parse(gpxString);
                state.elevationData = GPXParser.extractElevationData(state.gpxData);
                state.waypoints = GPXParser.extractWaypoints(state.gpxData, state.elevationData);
                state.selection = null;

                showUploadSuccess(file.name, state.gpxData.tracks[0].name);
                enableSections();
                displayElevationProfile();
                updateWaypointSelector();
                updateStats();

            } catch (error) {
                console.error('Error parsing GPX:', error);
                showUploadError(error.message);
            }
        };

        reader.onerror = function() {
            showUploadError('Error reading file');
        };

        reader.readAsText(file);
    }

    /**
     * Shows upload success message
     * @param {string} fileName - Name of uploaded file
     * @param {string} trackName - Name of track from GPX
     */
    function showUploadSuccess(fileName, trackName) {
        elements.uploadStatus.textContent = `Loaded: ${fileName} (${trackName})`;
        elements.uploadStatus.className = 'upload-status upload-status--success';
    }

    /**
     * Shows upload error message
     * @param {string} message - Error message
     */
    function showUploadError(message) {
        elements.uploadStatus.textContent = `Error: ${message}`;
        elements.uploadStatus.className = 'upload-status upload-status--error';
    }

    /**
     * Enables the settings, profile, and generate sections
     */
    function enableSections() {
        elements.settingsSection.classList.remove('section--disabled');
        elements.profileSection.classList.remove('section--disabled');
        elements.generateSection.classList.remove('section--disabled');

        // Show share link button
        elements.shareLink.style.display = '';
        elements.shareLinkContainer.style.display = 'none';

        // Hide results until generated
        elements.resultsSection.classList.add('section--disabled');
    }

    /**
     * Displays the elevation profile chart
     */
    function displayElevationProfile() {
        if (!state.elevationData) return;
        ElevationProfile.setData(state.elevationData);
        ElevationProfile.setWaypoints(state.waypoints);
    }

    /**
     * Updates the waypoint selector dropdowns
     */
    function updateWaypointSelector() {
        if (!state.waypoints || state.waypoints.length === 0) {
            elements.waypointSelector.style.display = 'none';
            return;
        }

        elements.waypointSelector.style.display = 'block';

        // Clear existing options
        elements.waypointStartSelect.innerHTML = '<option value="">Route Start</option>';
        elements.waypointEndSelect.innerHTML = '<option value="">Route End</option>';

        // Add waypoint options
        state.waypoints.forEach((wpt, index) => {
            const distanceText = UnitConverter.formatDistance(wpt.distance);
            const optionText = wpt.name + ' (' + distanceText + ')';

            const startOption = document.createElement('option');
            startOption.value = index;
            startOption.textContent = optionText;
            elements.waypointStartSelect.appendChild(startOption);

            const endOption = document.createElement('option');
            endOption.value = index;
            endOption.textContent = optionText;
            elements.waypointEndSelect.appendChild(endOption);
        });
    }

    /**
     * Handles waypoint selection apply button click
     */
    function handleWaypointSelection() {
        const startIdx = elements.waypointStartSelect.value;
        const endIdx = elements.waypointEndSelect.value;

        let startDistance = 0;
        let endDistance = state.elevationData[state.elevationData.length - 1].distance;

        if (startIdx !== '') {
            startDistance = state.waypoints[parseInt(startIdx)].distance;
        }

        if (endIdx !== '') {
            endDistance = state.waypoints[parseInt(endIdx)].distance;
        }

        // Ensure start < end
        if (startDistance > endDistance) {
            const temp = startDistance;
            startDistance = endDistance;
            endDistance = temp;
        }

        ElevationProfile.setSelection(startDistance, endDistance);
    }

    /**
     * Updates the statistics display
     */
    function updateStats() {
        if (!state.elevationData) return;

        let stats;
        if (state.selection) {
            stats = GPXParser.calculateStats(
                state.elevationData,
                state.selection.startIndex,
                state.selection.endIndex
            );
        } else {
            stats = GPXParser.calculateStats(state.elevationData);
        }

        elements.statDistance.textContent = formatDistance(stats.distance);
        elements.statGain.textContent = formatElevation(stats.totalGain);
        elements.statLoss.textContent = formatElevation(stats.totalLoss);
        elements.statMinElev.textContent = formatElevation(stats.minElevation);
        elements.statMaxElev.textContent = formatElevation(stats.maxElevation);
    }

    /**
     * Handles selection change from elevation profile
     * @param {Object|null} selection - Selection info or null if cleared
     */
    function handleSelectionChange(selection) {
        state.selection = selection;

        if (selection) {
            elements.clearSelectionBtn.style.display = 'inline-block';
        } else {
            elements.clearSelectionBtn.style.display = 'none';
        }

        updateSelectionInfo();
        updateStats();
    }

    /**
     * Handles clear selection button click
     */
    function handleClearSelection() {
        ElevationProfile.clearSelection();
        state.selection = null;
        elements.selectionInfo.textContent = 'Full route selected';
        elements.clearSelectionBtn.style.display = 'none';
        updateStats();
    }

    /**
     * Validates treadmill settings
     */
    function validateSettings() {
        const min = parseFloat(elements.minIncline.value);
        const max = parseFloat(elements.maxIncline.value);

        if (min > max) {
            elements.minIncline.value = max;
        }
    }

    /**
     * Prepares elevation data by applying out-and-back mirroring and repeats.
     * Returns a new array with distances continuing from the end of the original.
     * @param {Array<{distance: number, elevation: number}>} points - Elevation data points
     * @param {boolean} outAndBack - Whether to mirror the route
     * @param {number} repeats - Number of times to repeat the route
     * @returns {Array<{distance: number, elevation: number}>} Prepared points
     */
    function prepareElevationData(points, outAndBack, repeats) {
        // Work on a copy
        var result = points.map(function(p) { return { distance: p.distance, elevation: p.elevation }; });

        if (outAndBack) {
            var totalDist = result[result.length - 1].distance - result[0].distance;
            var baseDist = result[result.length - 1].distance;
            for (var i = result.length - 2; i >= 0; i--) {
                result.push({
                    distance: baseDist + (totalDist - (result[i].distance - result[0].distance)),
                    elevation: result[i].elevation
                });
            }
        }

        if (repeats > 1) {
            var onePass = result.map(function(p) { return { distance: p.distance, elevation: p.elevation }; });
            var passDist = onePass[onePass.length - 1].distance - onePass[0].distance;
            for (var r = 1; r < repeats; r++) {
                for (var j = 1; j < onePass.length; j++) {
                    result.push({
                        distance: onePass[j].distance - onePass[0].distance + passDist * r + onePass[0].distance,
                        elevation: onePass[j].elevation
                    });
                }
            }
        }

        return result;
    }

    /**
     * Handles generate button click
     */
    function handleGenerate() {
        if (!state.elevationData) {
            alert('Please upload a GPX file first');
            return;
        }

        const options = {
            intervalDistance: parseFloat(elements.intervalDistance.value),
            minIncline: parseFloat(elements.minIncline.value),
            maxIncline: parseFloat(elements.maxIncline.value),
            inclineStep: parseFloat(elements.inclineStep.value)
        };

        // Slice the selected portion first
        var startIndex = state.selection ? state.selection.startIndex : 0;
        var endIndex = state.selection ? state.selection.endIndex : state.elevationData.length - 1;
        var selectedPoints = state.elevationData.slice(startIndex, endIndex + 1);

        // Apply out-and-back and repeats
        var outAndBack = elements.outAndBackCheckbox.checked;
        var repeats = parseInt(elements.repeatsInput.value, 10) || 1;
        if (repeats < 1) repeats = 1;

        var preparedPoints = prepareElevationData(selectedPoints, outAndBack, repeats);

        try {
            state.intervals = IntervalCalculator.calculate(preparedPoints, options);

            TableRenderer.render(state.intervals);
            elements.resultsSection.classList.remove('section--disabled');

            // Scroll to results
            elements.resultsSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error calculating intervals:', error);
            alert('Error generating intervals: ' + error.message);
        }
    }

    /**
     * Handles copy to clipboard
     */
    async function handleCopy() {
        const success = await TableRenderer.copyToClipboard();
        if (success) {
            const originalText = elements.copyBtn.textContent;
            elements.copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                elements.copyBtn.textContent = originalText;
            }, 2000);
        }
    }

    /**
     * Handles download CSV
     */
    function handleDownload() {
        TableRenderer.downloadCSV();
    }

    /**
     * Handles Generate Shareable Link button click
     */
    function handleGenerateLink() {
        if (!state.elevationData) return;

        try {
            var name = elements.shareLinkName.value.trim() || null;
            var link = LinkGenerator.generateLink(state.elevationData, state.waypoints, name);
            elements.shareLinkInput.value = link;
            elements.shareLinkContainer.style.display = '';
        } catch (error) {
            console.error('Error generating link:', error);
            alert('Error generating shareable link: ' + error.message);
        }
    }

    /**
     * Handles Copy shareable link button click
     */
    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(elements.shareLinkInput.value);
            var originalText = elements.shareLinkCopy.textContent;
            elements.shareLinkCopy.textContent = 'Copied!';
            setTimeout(function() {
                elements.shareLinkCopy.textContent = originalText;
            }, 2000);
        } catch (error) {
            // Fallback: select the input text
            elements.shareLinkInput.select();
        }
    }

    /**
     * Checks the URL for a shared route and loads it if present.
     * Called during init() after modules are ready.
     */
    function loadSharedRoute() {
        try {
            var data = LinkGenerator.loadFromURL();
            if (!data) return;

            state.elevationData = data.elevationData;
            state.waypoints = data.waypoints;
            state.selection = null;

            showUploadSuccess(data.routeName || 'Shared Link', 'Shared Route');
            enableSections();
            displayElevationProfile();
            updateWaypointSelector();
            updateStats();
        } catch (error) {
            console.error('Error loading shared route:', error);
        }
    }

    /**
     * Formats distance for display using current unit system
     * @param {number} km - Distance in km
     * @returns {string} Formatted string
     */
    function formatDistance(km) {
        return UnitConverter.formatDistance(km);
    }

    /**
     * Formats elevation for display using current unit system
     * @param {number} meters - Elevation in meters
     * @returns {string} Formatted string
     */
    function formatElevation(meters) {
        return UnitConverter.formatElevation(meters);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
