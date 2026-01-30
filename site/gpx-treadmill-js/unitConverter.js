/**
 * Unit Converter Module
 * Centralized unit state management and conversion functions
 */
const UnitConverter = (function() {
    'use strict';

    // Unit system: 'metric' or 'imperial'
    let currentSystem = 'metric';

    // Conversion constants
    const KM_TO_MILES = 0.621371;
    const METERS_TO_FEET = 3.28084;

    // Event listeners for unit changes
    const listeners = [];

    /**
     * Gets the current unit system
     * @returns {string} 'metric' or 'imperial'
     */
    function getSystem() {
        return currentSystem;
    }

    /**
     * Sets the unit system and notifies listeners
     * @param {string} system - 'metric' or 'imperial'
     */
    function setSystem(system) {
        if (system !== 'metric' && system !== 'imperial') {
            throw new Error('Invalid unit system. Must be "metric" or "imperial"');
        }

        if (currentSystem !== system) {
            currentSystem = system;
            savePreference();
            notifyListeners();
        }
    }

    /**
     * Toggles between metric and imperial
     * @returns {string} The new unit system
     */
    function toggle() {
        setSystem(currentSystem === 'metric' ? 'imperial' : 'metric');
        return currentSystem;
    }

    /**
     * Registers a callback to be called when units change
     * @param {Function} callback - Function to call on unit change
     */
    function onChange(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    }

    /**
     * Removes a callback from the listeners
     * @param {Function} callback - Function to remove
     */
    function offChange(callback) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Notifies all listeners of a unit change
     * @private
     */
    function notifyListeners() {
        listeners.forEach(callback => {
            try {
                callback(currentSystem);
            } catch (e) {
                console.error('Error in unit change listener:', e);
            }
        });
    }

    /**
     * Saves the unit preference to localStorage
     * @private
     */
    function savePreference() {
        try {
            localStorage.setItem('gpx-treadmill-units', currentSystem);
        } catch (e) {
            // localStorage not available, ignore
        }
    }

    /**
     * Loads the unit preference from localStorage
     * @private
     */
    function loadPreference() {
        try {
            const saved = localStorage.getItem('gpx-treadmill-units');
            if (saved === 'metric' || saved === 'imperial') {
                currentSystem = saved;
            }
        } catch (e) {
            // localStorage not available, use default
        }
    }

    // Distance conversion functions

    /**
     * Converts kilometers to miles
     * @param {number} km - Distance in kilometers
     * @returns {number} Distance in miles
     */
    function kmToMiles(km) {
        return km * KM_TO_MILES;
    }

    /**
     * Converts miles to kilometers
     * @param {number} miles - Distance in miles
     * @returns {number} Distance in kilometers
     */
    function milesToKm(miles) {
        return miles / KM_TO_MILES;
    }

    // Elevation conversion functions

    /**
     * Converts meters to feet
     * @param {number} meters - Elevation in meters
     * @returns {number} Elevation in feet
     */
    function metersToFeet(meters) {
        return meters * METERS_TO_FEET;
    }

    /**
     * Converts feet to meters
     * @param {number} feet - Elevation in feet
     * @returns {number} Elevation in meters
     */
    function feetToMeters(feet) {
        return feet / METERS_TO_FEET;
    }

    // Formatting functions

    /**
     * Formats distance for display in current unit system
     * @param {number} km - Distance in kilometers (internal unit)
     * @param {Object} options - Formatting options
     * @param {boolean} options.includeUnit - Whether to include the unit suffix (default: true)
     * @param {boolean} options.showSmallAsSubunit - Show small distances in m/ft (default: true)
     * @returns {string} Formatted distance string
     */
    function formatDistance(km, options) {
        const opts = Object.assign({ includeUnit: true, showSmallAsSubunit: true }, options);

        if (currentSystem === 'imperial') {
            const miles = kmToMiles(km);
            if (opts.showSmallAsSubunit && miles < 0.1) {
                const feet = miles * 5280;
                return Math.round(feet) + (opts.includeUnit ? ' ft' : '');
            }
            return miles.toFixed(2) + (opts.includeUnit ? ' mi' : '');
        } else {
            if (opts.showSmallAsSubunit && km < 1) {
                return Math.round(km * 1000) + (opts.includeUnit ? ' m' : '');
            }
            return km.toFixed(2) + (opts.includeUnit ? ' km' : '');
        }
    }

    /**
     * Formats distance for table display (no sub-units)
     * @param {number} km - Distance in kilometers
     * @returns {string} Formatted distance value (number only, no unit)
     */
    function formatDistanceValue(km) {
        if (currentSystem === 'imperial') {
            return kmToMiles(km).toFixed(2);
        }
        return km.toFixed(2);
    }

    /**
     * Formats elevation for display in current unit system
     * @param {number} meters - Elevation in meters (internal unit)
     * @param {Object} options - Formatting options
     * @param {boolean} options.includeUnit - Whether to include the unit suffix (default: true)
     * @returns {string} Formatted elevation string
     */
    function formatElevation(meters, options) {
        const opts = Object.assign({ includeUnit: true }, options);

        if (currentSystem === 'imperial') {
            const feet = metersToFeet(meters);
            return Math.round(feet) + (opts.includeUnit ? ' ft' : '');
        }
        return Math.round(meters) + (opts.includeUnit ? ' m' : '');
    }

    /**
     * Formats elevation for table display (number only)
     * @param {number} meters - Elevation in meters
     * @returns {string} Formatted elevation value (number only, no unit)
     */
    function formatElevationValue(meters) {
        if (currentSystem === 'imperial') {
            return Math.round(metersToFeet(meters)).toString();
        }
        return Math.round(meters).toString();
    }

    /**
     * Gets the current distance unit abbreviation
     * @returns {string} 'km' or 'mi'
     */
    function getDistanceUnit() {
        return currentSystem === 'imperial' ? 'mi' : 'km';
    }

    /**
     * Gets the current elevation unit abbreviation
     * @returns {string} 'm' or 'ft'
     */
    function getElevationUnit() {
        return currentSystem === 'imperial' ? 'ft' : 'm';
    }

    /**
     * Gets the current distance label for axes/headers
     * @returns {string} 'Distance (km)' or 'Distance (mi)'
     */
    function getDistanceLabel() {
        return 'Distance (' + getDistanceUnit() + ')';
    }

    /**
     * Gets the current elevation label for axes/headers
     * @returns {string} 'Elevation (m)' or 'Elevation (ft)'
     */
    function getElevationLabel() {
        return 'Elevation (' + getElevationUnit() + ')';
    }

    // Load saved preference on initialization
    loadPreference();

    // Public API
    return {
        getSystem,
        setSystem,
        toggle,
        onChange,
        offChange,
        kmToMiles,
        milesToKm,
        metersToFeet,
        feetToMeters,
        formatDistance,
        formatDistanceValue,
        formatElevation,
        formatElevationValue,
        getDistanceUnit,
        getElevationUnit,
        getDistanceLabel,
        getElevationLabel
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnitConverter;
}
