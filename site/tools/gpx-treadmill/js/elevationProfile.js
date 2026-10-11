/**
 * Elevation Profile Module
 * Renders an interactive elevation chart with selection capabilities
 */
const ElevationProfile = (function() {
    'use strict';

    // Chart configuration
    const CONFIG = {
        padding: { top: 20, right: 20, bottom: 40, left: 60 },
        font: '12px -apple-system, BlinkMacSystemFont, sans-serif'
    };

    /**
     * Gets current chart colors from ThemeManager
     * @returns {Object} Color configuration
     */
    function getColors() {
        if (typeof ThemeManager !== 'undefined') {
            return ThemeManager.getChartColors();
        }
        // Fallback to light theme colors
        return {
            line: '#2563eb',
            fill: 'rgba(37, 99, 235, 0.1)',
            selection: 'rgba(37, 99, 235, 0.3)',
            selectionBorder: '#2563eb',
            grid: '#e2e8f0',
            text: '#64748b',
            axis: '#1e293b',
            waypointMarker: '#f97316',
            waypointLine: '#f97316',
            waypointBorder: '#ffffff',
            waypointText: '#1e293b',
            waypointLabelBg: 'rgba(255, 255, 255, 0.9)'
        };
    }

    let canvas = null;
    let ctx = null;
    let points = [];
    let waypoints = [];
    let selection = { start: null, end: null };
    let isDragging = false;
    let dragStart = null;
    let onSelectionChange = null;

    // Chart dimensions (computed)
    let chartWidth = 0;
    let chartHeight = 0;
    let scaleX = 1;
    let scaleY = 1;
    let minElev = 0;
    let maxElev = 0;
    let maxDist = 0;

    /**
     * Initializes the elevation profile chart
     * @param {HTMLCanvasElement} canvasElement - The canvas element to render to
     * @param {Function} selectionCallback - Called when selection changes
     */
    function init(canvasElement, selectionCallback) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        onSelectionChange = selectionCallback;

        // Set up event listeners
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);

        // Touch support
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        // Handle resize
        window.addEventListener('resize', debounce(handleResize, 150));

        // Initial sizing
        handleResize();
    }

    /**
     * Sets the elevation data and renders the chart
     * @param {Array<{distance: number, elevation: number}>} data - Elevation data points
     */
    function setData(data) {
        points = data;
        selection = { start: null, end: null };

        if (points.length < 2) {
            console.warn('ElevationProfile: Need at least 2 data points');
            return;
        }

        // Calculate data bounds
        const elevations = points.map(p => p.elevation);
        minElev = Math.min(...elevations);
        maxElev = Math.max(...elevations);
        maxDist = points[points.length - 1].distance;

        // Add padding to elevation range
        const elevRange = maxElev - minElev;
        const elevPadding = elevRange * 0.1 || 10;
        minElev -= elevPadding;
        maxElev += elevPadding;

        // Use requestAnimationFrame to ensure the browser has completed layout
        // before calculating canvas dimensions (fixes initial squished render)
        requestAnimationFrame(function() {
            handleResize();
        });
    }

    /**
     * Sets waypoints to display on the chart
     * @param {Array<{name: string, distance: number, elevation: number}>} data - Waypoint data
     */
    function setWaypoints(data) {
        waypoints = data || [];
        // Only render if we have points (setData will handle initial render)
        if (points.length >= 2) {
            render();
        }
    }

    /**
     * Handles canvas resize
     */
    function handleResize() {
        if (!canvas) return;

        // Get the display size
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Set the canvas size in pixels
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale the context to account for device pixel ratio
        ctx.scale(dpr, dpr);

        // Update chart dimensions
        chartWidth = rect.width - CONFIG.padding.left - CONFIG.padding.right;
        chartHeight = rect.height - CONFIG.padding.top - CONFIG.padding.bottom;

        // Update scales
        if (maxDist > 0) {
            scaleX = chartWidth / maxDist;
            scaleY = chartHeight / (maxElev - minElev);
        }

        render();
    }

    /**
     * Renders the complete chart
     */
    function render() {
        if (!ctx || points.length < 2) return;

        const rect = canvas.getBoundingClientRect();

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw components
        drawGrid();
        drawAxes();
        drawElevationLine();
        drawWaypoints();
        drawSelection();
    }

    /**
     * Draws the background grid
     */
    function drawGrid() {
        const colors = getColors();
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;

        // Horizontal grid lines (elevation)
        const elevStep = calculateNiceStep(maxElev - minElev, 5);
        const startElev = Math.ceil(minElev / elevStep) * elevStep;

        for (let elev = startElev; elev <= maxElev; elev += elevStep) {
            const y = CONFIG.padding.top + chartHeight - (elev - minElev) * scaleY;
            ctx.beginPath();
            ctx.moveTo(CONFIG.padding.left, y);
            ctx.lineTo(CONFIG.padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Vertical grid lines (distance)
        const distStep = calculateNiceStep(maxDist, 6);
        for (let dist = 0; dist <= maxDist; dist += distStep) {
            const x = CONFIG.padding.left + dist * scaleX;
            ctx.beginPath();
            ctx.moveTo(x, CONFIG.padding.top);
            ctx.lineTo(x, CONFIG.padding.top + chartHeight);
            ctx.stroke();
        }
    }

    /**
     * Draws the axes with labels
     */
    function drawAxes() {
        const colors = getColors();
        ctx.font = CONFIG.font;
        ctx.fillStyle = colors.text;
        ctx.strokeStyle = colors.axis;
        ctx.lineWidth = 1;

        // Y-axis (elevation)
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, CONFIG.padding.top);
        ctx.lineTo(CONFIG.padding.left, CONFIG.padding.top + chartHeight);
        ctx.stroke();

        // Y-axis labels
        const elevStep = calculateNiceStep(maxElev - minElev, 5);
        const startElev = Math.ceil(minElev / elevStep) * elevStep;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let elev = startElev; elev <= maxElev; elev += elevStep) {
            const y = CONFIG.padding.top + chartHeight - (elev - minElev) * scaleY;
            ctx.fillText(formatElevation(elev), CONFIG.padding.left - 8, y);
        }

        // Y-axis title
        ctx.save();
        ctx.translate(15, CONFIG.padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(UnitConverter.getElevationLabel(), 0, 0);
        ctx.restore();

        // X-axis (distance)
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, CONFIG.padding.top + chartHeight);
        ctx.lineTo(CONFIG.padding.left + chartWidth, CONFIG.padding.top + chartHeight);
        ctx.stroke();

        // X-axis labels
        const distStep = calculateNiceStep(maxDist, 6);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let dist = 0; dist <= maxDist; dist += distStep) {
            const x = CONFIG.padding.left + dist * scaleX;
            ctx.fillText(formatDistance(dist), x, CONFIG.padding.top + chartHeight + 8);
        }

        // X-axis title
        const rect = canvas.getBoundingClientRect();
        ctx.fillText(UnitConverter.getDistanceLabel(), rect.width / 2, rect.height - 10);
    }

    /**
     * Draws the elevation profile line and fill
     */
    function drawElevationLine() {
        if (points.length < 2) return;

        // Draw fill
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, CONFIG.padding.top + chartHeight);

        points.forEach((point) => {
            const x = CONFIG.padding.left + point.distance * scaleX;
            const y = CONFIG.padding.top + chartHeight - (point.elevation - minElev) * scaleY;
            ctx.lineTo(x, y);
        });

        ctx.lineTo(CONFIG.padding.left + maxDist * scaleX, CONFIG.padding.top + chartHeight);
        ctx.closePath();
        const colors = getColors();
        ctx.fillStyle = colors.fill;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = CONFIG.padding.left + point.distance * scaleX;
            const y = CONFIG.padding.top + chartHeight - (point.elevation - minElev) * scaleY;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Draws waypoint markers on the chart
     */
    function drawWaypoints() {
        if (!waypoints || waypoints.length === 0) return;

        const colors = getColors();
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';

        waypoints.forEach((wpt, index) => {
            const x = CONFIG.padding.left + wpt.distance * scaleX;
            const y = CONFIG.padding.top + chartHeight - (wpt.elevation - minElev) * scaleY;

            // Draw vertical line from chart bottom to point
            ctx.beginPath();
            ctx.strokeStyle = colors.waypointLine || '#f97316';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(x, CONFIG.padding.top + chartHeight);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw marker circle
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = colors.waypointMarker || '#f97316';
            ctx.fill();
            ctx.strokeStyle = colors.waypointBorder || '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label above the marker
            const label = wpt.name.length > 12 ? wpt.name.substring(0, 10) + '...' : wpt.name;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Alternate label position (above/below) to avoid overlap
            const labelY = index % 2 === 0 ? y - 12 : y - 22;

            // Draw label background
            const labelWidth = ctx.measureText(label).width + 6;
            ctx.fillStyle = colors.waypointLabelBg || 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(x - labelWidth / 2, labelY - 12, labelWidth, 14);

            // Draw label text
            ctx.fillStyle = colors.waypointText || '#1e293b';
            ctx.fillText(label, x, labelY);
        });
    }

    /**
     * Draws the selection overlay
     */
    function drawSelection() {
        if (selection.start === null || selection.end === null) return;

        const colors = getColors();
        const startX = CONFIG.padding.left + selection.start * scaleX;
        const endX = CONFIG.padding.left + selection.end * scaleX;

        ctx.fillStyle = colors.selection;
        ctx.fillRect(
            Math.min(startX, endX),
            CONFIG.padding.top,
            Math.abs(endX - startX),
            chartHeight
        );

        ctx.strokeStyle = colors.selectionBorder;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            Math.min(startX, endX),
            CONFIG.padding.top,
            Math.abs(endX - startX),
            chartHeight
        );
        ctx.setLineDash([]);
    }

    /**
     * Converts mouse position to distance value
     * @param {number} clientX - Mouse X position
     * @returns {number} Distance in km
     */
    function mouseToDistance(clientX) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left - CONFIG.padding.left;
        const dist = x / scaleX;
        return Math.max(0, Math.min(maxDist, dist));
    }

    /**
     * Mouse event handlers
     */
    function handleMouseDown(e) {
        if (!points.length) return;
        isDragging = true;
        dragStart = mouseToDistance(e.clientX);
        selection = { start: dragStart, end: dragStart };
        render();
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        selection.end = mouseToDistance(e.clientX);
        render();
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;

        // Normalize selection (start < end)
        if (selection.start !== null && selection.end !== null) {
            const start = Math.min(selection.start, selection.end);
            const end = Math.max(selection.start, selection.end);

            // Only keep selection if it's significant
            if (end - start > maxDist * 0.01) {
                selection = { start, end };
                notifySelectionChange();
            } else {
                clearSelection();
            }
        }

        render();
    }

    /**
     * Touch event handlers
     */
    function handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseDown({ clientX: e.touches[0].clientX });
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseMove({ clientX: e.touches[0].clientX });
        }
    }

    function handleTouchEnd(e) {
        handleMouseUp();
    }

    /**
     * Notifies callback about selection change
     */
    function notifySelectionChange() {
        if (!onSelectionChange || !points.length) return;

        // Find point indices for selection
        const startIdx = findNearestPointIndex(selection.start);
        const endIdx = findNearestPointIndex(selection.end);

        onSelectionChange({
            startDistance: selection.start,
            endDistance: selection.end,
            startIndex: Math.min(startIdx, endIdx),
            endIndex: Math.max(startIdx, endIdx)
        });
    }

    /**
     * Finds the nearest point index for a given distance
     * @param {number} distance - Distance in km
     * @returns {number} Point index
     */
    function findNearestPointIndex(distance) {
        let nearestIdx = 0;
        let minDiff = Infinity;

        points.forEach((point, idx) => {
            const diff = Math.abs(point.distance - distance);
            if (diff < minDiff) {
                minDiff = diff;
                nearestIdx = idx;
            }
        });

        return nearestIdx;
    }

    /**
     * Clears the current selection
     */
    function clearSelection() {
        selection = { start: null, end: null };
        render();

        if (onSelectionChange) {
            onSelectionChange(null);
        }
    }

    /**
     * Sets the selection programmatically
     * @param {number} startDistance - Start distance in km
     * @param {number} endDistance - End distance in km
     */
    function setSelection(startDistance, endDistance) {
        if (!points.length) return;

        const start = Math.max(0, Math.min(maxDist, startDistance));
        const end = Math.max(0, Math.min(maxDist, endDistance));

        selection = {
            start: Math.min(start, end),
            end: Math.max(start, end)
        };

        render();
        notifySelectionChange();
    }

    /**
     * Gets the current selection
     * @returns {Object|null} Selection object or null
     */
    function getSelection() {
        if (selection.start === null || selection.end === null) {
            return null;
        }

        const startIdx = findNearestPointIndex(selection.start);
        const endIdx = findNearestPointIndex(selection.end);

        return {
            startDistance: selection.start,
            endDistance: selection.end,
            startIndex: Math.min(startIdx, endIdx),
            endIndex: Math.max(startIdx, endIdx)
        };
    }

    /**
     * Calculates a "nice" step value for axis labels
     * @param {number} range - The range to cover
     * @param {number} targetSteps - Desired number of steps
     * @returns {number} Nice step value
     */
    function calculateNiceStep(range, targetSteps) {
        const roughStep = range / targetSteps;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const normalized = roughStep / magnitude;

        let niceStep;
        if (normalized < 1.5) {
            niceStep = magnitude;
        } else if (normalized < 3) {
            niceStep = 2 * magnitude;
        } else if (normalized < 7) {
            niceStep = 5 * magnitude;
        } else {
            niceStep = 10 * magnitude;
        }

        return niceStep;
    }

    /**
     * Formats elevation for display (axis labels, no unit suffix)
     * @param {number} elev - Elevation in meters
     * @returns {string} Formatted string
     */
    function formatElevation(elev) {
        return UnitConverter.formatElevationValue(elev);
    }

    /**
     * Formats distance for display (axis labels)
     * @param {number} dist - Distance in km
     * @returns {string} Formatted string
     */
    function formatDistance(dist) {
        if (UnitConverter.getSystem() === 'imperial') {
            const miles = UnitConverter.kmToMiles(dist);
            if (miles < 0.1) {
                return Math.round(miles * 5280) + 'ft';
            }
            return miles.toFixed(1);
        } else {
            if (dist < 1) {
                return Math.round(dist * 1000) + 'm';
            }
            return dist.toFixed(1);
        }
    }

    /**
     * Simple debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public API
    return {
        init,
        setData,
        setWaypoints,
        setSelection,
        clearSelection,
        getSelection,
        render
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevationProfile;
}
