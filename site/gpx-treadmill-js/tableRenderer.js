/**
 * Table Renderer Module
 * Renders interval results to HTML table and handles export
 */
const TableRenderer = (function() {
    'use strict';

    let tableBody = null;
    let summaryElement = null;
    let currentIntervals = [];

    /**
     * Initializes the table renderer
     * @param {HTMLElement} tbody - Table body element
     * @param {HTMLElement} summary - Summary display element
     */
    function init(tbody, summary) {
        tableBody = tbody;
        summaryElement = summary;
    }


    /**
     * Renders intervals to the table
     * @param {Array} intervals - Array of interval objects
     */
    function render(intervals) {
        currentIntervals = intervals;

        if (!tableBody) {
            console.error('TableRenderer: table body not initialized');
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        if (!intervals || intervals.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center;">No intervals to display</td>';
            tableBody.appendChild(row);
            return;
        }

        // Render each interval
        intervals.forEach((interval, index) => {
            const row = createTableRow(interval, index);
            tableBody.appendChild(row);
        });

        // Update summary
        renderSummary(intervals);
    }

    /**
     * Creates a table row for an interval
     * @param {Object} interval - Interval data
     * @param {number} index - Row index
     * @returns {HTMLTableRowElement} Table row element
     */
    function createTableRow(interval, index) {
        const row = document.createElement('tr');

        // Add class based on incline direction
        if (interval.incline > 0.5) {
            row.classList.add('row--uphill');
        } else if (interval.incline < -0.5) {
            row.classList.add('row--downhill');
        }

        row.innerHTML = `
            <td>${formatDistance(interval.startDistance)}</td>
            <td>${formatDistance(interval.endDistance)}</td>
            <td>${formatIncline(interval.incline)}</td>
            <td>${formatElevation(interval.elevationChange)}</td>
            <td>${formatDistance(interval.cumulativeDistance)}</td>
            <td>${formatElevationWithDiff(interval.cumulativeAdjustedGain, interval.gainDifference)}</td>
            <td>${formatElevationWithDiff(interval.cumulativeAdjustedLoss, interval.lossDifference)}</td>
        `;

        return row;
    }

    /**
     * Formats elevation with difference indicator for display
     * Shows how treadmill compares to course: negative means less than course, positive means more
     * @param {number} adjustedValue - Adjusted elevation value in meters
     * @param {number} difference - Difference from actual (actual - adjusted), i.e. (course - treadmill)
     * @returns {string} Formatted string with difference
     */
    function formatElevationWithDiff(adjustedValue, difference) {
        const adjustedFormatted = UnitConverter.formatElevationValue(adjustedValue);

        // Only show difference if it's significant (> 0.5 meters)
        if (Math.abs(difference) < 0.5) {
            return adjustedFormatted;
        }

        const diffFormatted = UnitConverter.formatElevationValue(Math.abs(difference));
        // Flip sign: show treadmill vs course (negative = less than course, positive = more than course)
        const sign = difference > 0 ? '-' : '+';
        const diffClass = difference > 0 ? 'diff--positive' : 'diff--negative';

        return `${adjustedFormatted} <span class="elevation-diff ${diffClass}">(${sign}${diffFormatted})</span>`;
    }

    /**
     * Renders the summary section
     * @param {Array} intervals - Interval data
     */
    function renderSummary(intervals) {
        if (!summaryElement) return;

        const summary = IntervalCalculator.generateSummary(intervals);
        if (!summary) {
            summaryElement.innerHTML = '';
            return;
        }

        const distUnit = UnitConverter.getDistanceUnit();
        const elevUnit = UnitConverter.getElevationUnit();

        // Format gain with difference
        const gainDiffHtml = formatSummaryDiff(summary.gainDifference, elevUnit);
        const lossDiffHtml = formatSummaryDiff(summary.lossDifference, elevUnit);

        summaryElement.innerHTML = `
            <div class="summary-row">
                <strong>Summary:</strong> ${summary.totalIntervals} intervals |
                Total: ${formatDistance(summary.totalDistance)} ${distUnit} |
                Uphill: ${summary.uphillIntervals} |
                Flat: ${summary.flatIntervals} |
                Downhill: ${summary.downhillIntervals}
            </div>
            <div class="summary-row summary-row--elevation">
                <span class="summary-label">Treadmill Gain:</span> ${formatElevation(summary.totalAdjustedGain)} ${elevUnit}${gainDiffHtml} |
                <span class="summary-label">Treadmill Loss:</span> ${formatElevation(summary.totalAdjustedLoss)} ${elevUnit}${lossDiffHtml}
            </div>
        `;
    }

    /**
     * Formats difference for summary display
     * Shows how treadmill compares to course: negative means less than course, positive means more
     * @param {number} difference - Difference value in meters (course - treadmill)
     * @param {string} unit - Elevation unit
     * @returns {string} Formatted HTML string
     */
    function formatSummaryDiff(difference, unit) {
        if (Math.abs(difference) < 0.5) {
            return '';
        }

        const diffFormatted = formatElevation(Math.abs(difference));
        // Flip sign: show treadmill vs course (negative = less than course, positive = more than course)
        const sign = difference > 0 ? '-' : '+';
        const diffClass = difference > 0 ? 'diff--positive' : 'diff--negative';

        return ` <span class="elevation-diff ${diffClass}">(${sign}${diffFormatted} ${unit} vs course)</span>`;
    }

    /**
     * Formats distance for display (number only, no unit)
     * @param {number} km - Distance in km
     * @returns {string} Formatted string
     */
    function formatDistance(km) {
        return UnitConverter.formatDistanceValue(km);
    }

    /**
     * Formats incline for display
     * @param {number} incline - Incline percentage
     * @returns {string} Formatted string
     */
    function formatIncline(incline) {
        const sign = incline >= 0 ? '+' : '';
        return sign + incline.toFixed(1) + '%';
    }

    /**
     * Formats elevation for display (number only, no unit)
     * @param {number} meters - Elevation in meters
     * @returns {string} Formatted string
     */
    function formatElevation(meters) {
        return UnitConverter.formatElevationValue(meters);
    }

    /**
     * Generates CSV content from intervals
     * @returns {string} CSV content
     */
    function generateCSV() {
        if (!currentIntervals || currentIntervals.length === 0) {
            return '';
        }

        const distUnit = UnitConverter.getDistanceUnit();
        const elevUnit = UnitConverter.getElevationUnit();

        // Header
        const headers = [
            `Start (${distUnit})`,
            `End (${distUnit})`,
            'Incline %',
            `Elev Change (${elevUnit})`,
            `Cumul Dist (${distUnit})`,
            `Treadmill Gain (${elevUnit})`,
            `Treadmill Loss (${elevUnit})`,
            `Course Gain (${elevUnit})`,
            `Course Loss (${elevUnit})`,
            `Gain Diff (${elevUnit})`,
            `Loss Diff (${elevUnit})`
        ];

        const rows = [headers.join(',')];

        // Data rows
        currentIntervals.forEach(interval => {
            const row = [
                formatDistance(interval.startDistance),
                formatDistance(interval.endDistance),
                interval.incline.toFixed(1),
                formatElevation(interval.elevationChange),
                formatDistance(interval.cumulativeDistance),
                formatElevation(interval.cumulativeAdjustedGain),
                formatElevation(interval.cumulativeAdjustedLoss),
                formatElevation(interval.cumulativeGain),
                formatElevation(interval.cumulativeLoss),
                formatElevation(interval.gainDifference),
                formatElevation(interval.lossDifference)
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Generates plain text content for clipboard
     * @returns {string} Plain text content
     */
    function generatePlainText() {
        if (!currentIntervals || currentIntervals.length === 0) {
            return '';
        }

        const distUnit = UnitConverter.getDistanceUnit();
        const elevUnit = UnitConverter.getElevationUnit();

        const lines = ['GPX to Treadmill - Interval Settings', ''];

        currentIntervals.forEach((interval, idx) => {
            lines.push(
                `${idx + 1}. ${formatDistance(interval.startDistance)}-${formatDistance(interval.endDistance)} ${distUnit}: ` +
                `${formatIncline(interval.incline)} incline`
            );
        });

        const summary = IntervalCalculator.generateSummary(currentIntervals);
        if (summary) {
            lines.push('');
            lines.push(`Total: ${formatDistance(summary.totalDistance)} ${distUnit}`);
            lines.push('');
            lines.push('Treadmill Simulation:');
            lines.push(`  Elevation Gain: ${formatElevation(summary.totalAdjustedGain)} ${elevUnit}`);
            lines.push(`  Elevation Loss: ${formatElevation(summary.totalAdjustedLoss)} ${elevUnit}`);
            lines.push('');
            lines.push('Actual Course:');
            lines.push(`  Elevation Gain: ${formatElevation(summary.totalGain)} ${elevUnit}`);
            lines.push(`  Elevation Loss: ${formatElevation(summary.totalLoss)} ${elevUnit}`);

            // Show differences if significant (treadmill vs course)
            if (Math.abs(summary.gainDifference) >= 0.5 || Math.abs(summary.lossDifference) >= 0.5) {
                lines.push('');
                lines.push('Difference (Treadmill vs Course):');
                if (Math.abs(summary.gainDifference) >= 0.5) {
                    // gainDifference is (course - treadmill), so negate for (treadmill - course)
                    const treadmillVsCourse = -summary.gainDifference;
                    const sign = treadmillVsCourse >= 0 ? '+' : '';
                    lines.push(`  Gain: ${sign}${formatElevation(treadmillVsCourse)} ${elevUnit}`);
                }
                if (Math.abs(summary.lossDifference) >= 0.5) {
                    // lossDifference is (course - treadmill), so negate for (treadmill - course)
                    const treadmillVsCourse = -summary.lossDifference;
                    const sign = treadmillVsCourse >= 0 ? '+' : '';
                    lines.push(`  Loss: ${sign}${formatElevation(treadmillVsCourse)} ${elevUnit}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Downloads the intervals as a CSV file
     */
    function downloadCSV() {
        const csv = generateCSV();
        if (!csv) {
            alert('No data to download');
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'treadmill-intervals.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    /**
     * Copies the intervals to clipboard
     * @returns {Promise<boolean>} True if successful
     */
    async function copyToClipboard() {
        const text = generatePlainText();
        if (!text) {
            alert('No data to copy');
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                return true;
            } catch (e) {
                console.error('Failed to copy to clipboard:', e);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    /**
     * Gets the current intervals
     * @returns {Array} Current intervals
     */
    function getIntervals() {
        return currentIntervals;
    }

    // Public API
    return {
        init,
        render,
        generateCSV,
        generatePlainText,
        downloadCSV,
        copyToClipboard,
        getIntervals
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableRenderer;
}
