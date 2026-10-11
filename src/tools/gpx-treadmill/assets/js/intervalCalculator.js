/**
 * Interval Calculator Module
 * Calculates treadmill incline intervals from elevation data
 */
const IntervalCalculator = (function() {
    'use strict';

    /**
     * Calculates treadmill intervals from elevation data
     * @param {Array<{distance: number, elevation: number}>} points - Elevation data points
     * @param {Object} options - Configuration options
     * @param {number} options.intervalDistance - Distance between intervals in km
     * @param {number} options.minIncline - Minimum incline percentage (e.g., -3)
     * @param {number} options.maxIncline - Maximum incline percentage (e.g., 12)
     * @param {number} options.inclineStep - Incline increment step (e.g., 0.5)
     * @param {number} [options.startIndex] - Optional start index in points array
     * @param {number} [options.endIndex] - Optional end index in points array
     * @returns {Array<IntervalResult>} Calculated intervals
     */
    function calculate(points, options) {
        validateInputs(points, options);

        const {
            intervalDistance,
            minIncline,
            maxIncline,
            inclineStep,
            startIndex = 0,
            endIndex = points.length - 1
        } = options;

        // Get the selected portion of points
        const selectedPoints = points.slice(startIndex, endIndex + 1);

        if (selectedPoints.length < 2) {
            throw new Error('Need at least 2 points to calculate intervals');
        }

        // Calculate base distance offset
        const baseDistance = selectedPoints[0].distance;

        const intervals = [];
        let currentIntervalStart = 0;
        let cumulativeGain = 0;
        let cumulativeLoss = 0;
        let cumulativeAdjustedGain = 0;
        let cumulativeAdjustedLoss = 0;

        // Process points into intervals
        while (currentIntervalStart < selectedPoints.length - 1) {
            const intervalResult = calculateSingleInterval(
                selectedPoints,
                currentIntervalStart,
                intervalDistance,
                baseDistance,
                {
                    minIncline,
                    maxIncline,
                    inclineStep,
                    cumulativeGain,
                    cumulativeLoss,
                    cumulativeAdjustedGain,
                    cumulativeAdjustedLoss
                }
            );

            if (intervalResult) {
                intervals.push(intervalResult.interval);
                cumulativeGain = intervalResult.cumulativeGain;
                cumulativeLoss = intervalResult.cumulativeLoss;
                cumulativeAdjustedGain = intervalResult.cumulativeAdjustedGain;
                cumulativeAdjustedLoss = intervalResult.cumulativeAdjustedLoss;
                currentIntervalStart = intervalResult.nextStartIndex;
            } else {
                break;
            }
        }

        return intervals;
    }

    /**
     * Calculates a single interval
     * @private
     */
    function calculateSingleInterval(points, startIndex, intervalDistance, baseDistance, options) {
        const {
            minIncline,
            maxIncline,
            inclineStep,
            cumulativeGain,
            cumulativeLoss,
            cumulativeAdjustedGain,
            cumulativeAdjustedLoss
        } = options;

        const startPoint = points[startIndex];
        const startDist = startPoint.distance - baseDistance;
        const targetEndDist = startDist + intervalDistance;

        // Find the end point for this interval
        let endIndex = startIndex;
        for (let i = startIndex; i < points.length; i++) {
            const pointDist = points[i].distance - baseDistance;
            if (pointDist >= targetEndDist || i === points.length - 1) {
                endIndex = i;
                break;
            }
        }

        // If we haven't moved, we're done
        if (endIndex === startIndex && endIndex === points.length - 1) {
            return null;
        }

        const endPoint = points[endIndex];
        const endDist = endPoint.distance - baseDistance;

        // Calculate elevation change within this interval (actual course values)
        let intervalGain = 0;
        let intervalLoss = 0;

        for (let i = startIndex; i < endIndex; i++) {
            const elevChange = points[i + 1].elevation - points[i].elevation;
            if (elevChange > 0) {
                intervalGain += elevChange;
            } else {
                intervalLoss += Math.abs(elevChange);
            }
        }

        // Calculate net elevation change
        const netElevChange = endPoint.elevation - startPoint.elevation;
        const horizontalDist = (endDist - startDist) * 1000; // Convert km to meters

        // Calculate grade percentage
        let grade = 0;
        if (horizontalDist > 0) {
            grade = (netElevChange / horizontalDist) * 100;
        }

        // Clamp to treadmill limits
        let incline = Math.max(minIncline, Math.min(maxIncline, grade));

        // Round to nearest step
        incline = roundToStep(incline, inclineStep);

        // Calculate adjusted elevation change based on the treadmill incline
        // This represents what the user will actually experience on the treadmill
        const adjustedElevChange = (incline / 100) * horizontalDist;

        // Calculate adjusted gain/loss for this interval
        let adjustedGain = 0;
        let adjustedLoss = 0;
        if (adjustedElevChange > 0) {
            adjustedGain = adjustedElevChange;
        } else {
            adjustedLoss = Math.abs(adjustedElevChange);
        }

        // Update cumulative values (actual course)
        const newCumulativeGain = cumulativeGain + intervalGain;
        const newCumulativeLoss = cumulativeLoss + intervalLoss;

        // Update cumulative values (adjusted for treadmill)
        const newCumulativeAdjustedGain = cumulativeAdjustedGain + adjustedGain;
        const newCumulativeAdjustedLoss = cumulativeAdjustedLoss + adjustedLoss;

        return {
            interval: {
                startDistance: startDist,
                endDistance: endDist,
                incline: incline,
                elevationChange: netElevChange,
                adjustedElevChange: adjustedElevChange,
                cumulativeDistance: endDist,
                // Actual course values
                cumulativeGain: newCumulativeGain,
                cumulativeLoss: newCumulativeLoss,
                // Adjusted values (what user experiences on treadmill)
                cumulativeAdjustedGain: newCumulativeAdjustedGain,
                cumulativeAdjustedLoss: newCumulativeAdjustedLoss,
                // Difference between actual and adjusted
                gainDifference: newCumulativeGain - newCumulativeAdjustedGain,
                lossDifference: newCumulativeLoss - newCumulativeAdjustedLoss,
                actualGrade: grade
            },
            cumulativeGain: newCumulativeGain,
            cumulativeLoss: newCumulativeLoss,
            cumulativeAdjustedGain: newCumulativeAdjustedGain,
            cumulativeAdjustedLoss: newCumulativeAdjustedLoss,
            nextStartIndex: endIndex
        };
    }

    /**
     * Validates input parameters
     * @private
     */
    function validateInputs(points, options) {
        if (!Array.isArray(points) || points.length < 2) {
            throw new Error('Points must be an array with at least 2 elements');
        }

        if (!options || typeof options !== 'object') {
            throw new Error('Options object is required');
        }

        const { intervalDistance, minIncline, maxIncline, inclineStep } = options;

        if (typeof intervalDistance !== 'number' || intervalDistance <= 0) {
            throw new Error('intervalDistance must be a positive number');
        }

        if (typeof minIncline !== 'number') {
            throw new Error('minIncline must be a number');
        }

        if (typeof maxIncline !== 'number') {
            throw new Error('maxIncline must be a number');
        }

        if (minIncline > maxIncline) {
            throw new Error('minIncline cannot be greater than maxIncline');
        }

        if (typeof inclineStep !== 'number' || inclineStep <= 0) {
            throw new Error('inclineStep must be a positive number');
        }
    }

    /**
     * Rounds a value to the nearest step
     * @param {number} value - Value to round
     * @param {number} step - Step size
     * @returns {number} Rounded value
     */
    function roundToStep(value, step) {
        return Math.round(value / step) * step;
    }

    /**
     * Converts kilometers to miles
     * @param {number} km - Distance in kilometers
     * @returns {number} Distance in miles
     */
    function kmToMiles(km) {
        return km * 0.621371;
    }

    /**
     * Converts miles to kilometers
     * @param {number} miles - Distance in miles
     * @returns {number} Distance in kilometers
     */
    function milesToKm(miles) {
        return miles / 0.621371;
    }

    /**
     * Converts meters to feet
     * @param {number} meters - Distance in meters
     * @returns {number} Distance in feet
     */
    function metersToFeet(meters) {
        return meters * 3.28084;
    }

    /**
     * Formats distance with appropriate unit
     * @param {number} km - Distance in kilometers
     * @param {string} unit - 'km' or 'miles'
     * @returns {string} Formatted distance string
     */
    function formatDistance(km, unit = 'km') {
        if (unit === 'miles') {
            const miles = kmToMiles(km);
            return miles.toFixed(2) + ' mi';
        }
        return km.toFixed(2) + ' km';
    }

    /**
     * Formats elevation with appropriate unit
     * @param {number} meters - Elevation in meters
     * @param {string} unit - 'm' or 'ft'
     * @returns {string} Formatted elevation string
     */
    function formatElevation(meters, unit = 'm') {
        if (unit === 'ft') {
            const feet = metersToFeet(meters);
            return Math.round(feet) + ' ft';
        }
        return Math.round(meters) + ' m';
    }

    /**
     * Generates a summary of the calculated intervals
     * @param {Array} intervals - Array of calculated intervals
     * @returns {Object} Summary statistics
     */
    function generateSummary(intervals) {
        if (!intervals || intervals.length === 0) {
            return null;
        }

        const lastInterval = intervals[intervals.length - 1];

        // Count intervals by incline type
        let uphillCount = 0;
        let flatCount = 0;
        let downhillCount = 0;

        intervals.forEach(interval => {
            if (interval.incline > 0.5) {
                uphillCount++;
            } else if (interval.incline < -0.5) {
                downhillCount++;
            } else {
                flatCount++;
            }
        });

        // Calculate average incline
        const avgIncline = intervals.reduce((sum, i) => sum + i.incline, 0) / intervals.length;

        return {
            totalIntervals: intervals.length,
            totalDistance: lastInterval.cumulativeDistance,
            // Actual course values
            totalGain: lastInterval.cumulativeGain,
            totalLoss: lastInterval.cumulativeLoss,
            // Adjusted values (what user experiences on treadmill)
            totalAdjustedGain: lastInterval.cumulativeAdjustedGain,
            totalAdjustedLoss: lastInterval.cumulativeAdjustedLoss,
            // Differences
            gainDifference: lastInterval.gainDifference,
            lossDifference: lastInterval.lossDifference,
            uphillIntervals: uphillCount,
            flatIntervals: flatCount,
            downhillIntervals: downhillCount,
            averageIncline: avgIncline
        };
    }

    // Public API
    return {
        calculate,
        roundToStep,
        kmToMiles,
        milesToKm,
        metersToFeet,
        formatDistance,
        formatElevation,
        generateSummary
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntervalCalculator;
}
