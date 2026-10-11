/**
 * Theme Manager Module
 * Detects OS color scheme preference for canvas rendering colors
 */
const ThemeManager = (function() {
    'use strict';

    // Resolved theme: 'light' or 'dark' (based on OS preference)
    let resolvedTheme = 'light';

    // Event listeners for theme changes
    const listeners = [];

    // Media query for system preference detection
    let mediaQuery = null;

    /**
     * Gets the current theme mode setting
     * @returns {string} Always 'system'
     */
    function getMode() {
        return 'system';
    }

    /**
     * Gets the resolved theme (what's actually displayed)
     * @returns {string} 'light' or 'dark'
     */
    function getTheme() {
        return resolvedTheme;
    }

    /**
     * No-op stub for compatibility with other modules
     */
    function setMode() {
        // No-op: theme is controlled by OS preference
    }

    /**
     * Registers a callback to be called when theme changes
     * @param {Function} callback - Function to call on theme change
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
     * Notifies all listeners of a theme change
     * @private
     */
    function notifyListeners() {
        listeners.forEach(callback => {
            try {
                callback(resolvedTheme, 'system');
            } catch (e) {
                console.error('Error in theme change listener:', e);
            }
        });
    }

    /**
     * Gets the system's preferred color scheme
     * @returns {string} 'light' or 'dark'
     * @private
     */
    function getSystemTheme() {
        if (mediaQuery && mediaQuery.matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Handles system preference change
     * @private
     */
    function handleSystemChange() {
        const previousTheme = resolvedTheme;
        resolvedTheme = getSystemTheme();
        if (previousTheme !== resolvedTheme) {
            notifyListeners();
        }
    }

    /**
     * Initializes the theme manager
     * Sets up system preference listener
     */
    function init() {
        if (window.matchMedia) {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', handleSystemChange);
        }
        resolvedTheme = getSystemTheme();
    }

    /**
     * Gets colors for canvas rendering based on current theme
     * @returns {Object} Color configuration object
     */
    function getChartColors() {
        // Dracula dark palette
        if (resolvedTheme === 'dark') {
            return {
                line: '#bd93f9',
                fill: 'rgba(189, 147, 249, 0.15)',
                selection: 'rgba(189, 147, 249, 0.3)',
                selectionBorder: '#bd93f9',
                grid: '#44475a',
                text: '#6272a4',
                axis: '#f8f8f2',
                waypointMarker: '#ffb86c',
                waypointLine: '#ffb86c',
                waypointBorder: '#282a36',
                waypointText: '#f8f8f2',
                waypointLabelBg: 'rgba(40, 42, 54, 0.9)'
            };
        }
        // Material light palette
        return {
            line: '#6200ea',
            fill: 'rgba(98, 0, 234, 0.1)',
            selection: 'rgba(98, 0, 234, 0.3)',
            selectionBorder: '#6200ea',
            grid: '#e0e0e0',
            text: '#757575',
            axis: '#212121',
            waypointMarker: '#f97316',
            waypointLine: '#f97316',
            waypointBorder: '#ffffff',
            waypointText: '#212121',
            waypointLabelBg: 'rgba(255, 255, 255, 0.9)'
        };
    }

    // Initialize on load
    init();

    // Public API
    return {
        getMode,
        getTheme,
        setMode,
        onChange,
        offChange,
        getChartColors,
        init
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
