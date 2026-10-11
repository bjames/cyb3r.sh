/**
 * GPX Parser Module
 * Parses GPX XML files and extracts elevation/distance data
 */
const GPXParser = (function() {
    'use strict';

    /**
     * Earth's radius in kilometers for Haversine formula
     */
    const EARTH_RADIUS_KM = 6371;

    /**
     * Calculates distance between two GPS coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point in degrees
     * @param {number} lon1 - Longitude of first point in degrees
     * @param {number} lat2 - Latitude of second point in degrees
     * @param {number} lon2 - Longitude of second point in degrees
     * @returns {number} Distance in kilometers
     */
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => deg * Math.PI / 180;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    /**
     * Parses a GPX XML string and extracts track data
     * @param {string} gpxString - Raw GPX XML content
     * @returns {Object} Parsed GPX data with tracks and points
     * @throws {Error} If GPX is invalid or cannot be parsed
     */
    function parse(gpxString) {
        if (!gpxString || typeof gpxString !== 'string') {
            throw new Error('Invalid GPX data: expected a non-empty string');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(gpxString, 'application/xml');

        // Check for XML parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid GPX XML: ' + parseError.textContent);
        }

        // Check for GPX root element
        const gpxRoot = doc.querySelector('gpx');
        if (!gpxRoot) {
            throw new Error('Invalid GPX: missing gpx root element');
        }

        const tracks = [];

        // Parse all tracks
        const trkElements = doc.querySelectorAll('trk');
        trkElements.forEach((trk, trackIndex) => {
            const trackName = trk.querySelector('name')?.textContent || `Track ${trackIndex + 1}`;
            const segments = [];

            // Parse all segments within the track
            const trksegElements = trk.querySelectorAll('trkseg');
            trksegElements.forEach((trkseg) => {
                const points = [];
                const trkptElements = trkseg.querySelectorAll('trkpt');

                trkptElements.forEach((trkpt) => {
                    const lat = parseFloat(trkpt.getAttribute('lat'));
                    const lon = parseFloat(trkpt.getAttribute('lon'));
                    const eleElement = trkpt.querySelector('ele');
                    const elevation = eleElement ? parseFloat(eleElement.textContent) : null;

                    if (!isNaN(lat) && !isNaN(lon)) {
                        points.push({
                            lat,
                            lon,
                            elevation: isNaN(elevation) ? null : elevation
                        });
                    }
                });

                if (points.length > 0) {
                    segments.push(points);
                }
            });

            if (segments.length > 0) {
                tracks.push({
                    name: trackName,
                    segments
                });
            }
        });

        // Also check for routes (rte elements) as some GPX files use these
        const rteElements = doc.querySelectorAll('rte');
        rteElements.forEach((rte, routeIndex) => {
            const routeName = rte.querySelector('name')?.textContent || `Route ${routeIndex + 1}`;
            const points = [];

            const rteptElements = rte.querySelectorAll('rtept');
            rteptElements.forEach((rtept) => {
                const lat = parseFloat(rtept.getAttribute('lat'));
                const lon = parseFloat(rtept.getAttribute('lon'));
                const eleElement = rtept.querySelector('ele');
                const elevation = eleElement ? parseFloat(eleElement.textContent) : null;

                if (!isNaN(lat) && !isNaN(lon)) {
                    points.push({
                        lat,
                        lon,
                        elevation: isNaN(elevation) ? null : elevation
                    });
                }
            });

            if (points.length > 0) {
                tracks.push({
                    name: routeName,
                    segments: [points]
                });
            }
        });

        if (tracks.length === 0) {
            throw new Error('No valid tracks or routes found in GPX file');
        }

        // Parse waypoints
        const waypoints = [];
        const wptElements = doc.querySelectorAll('wpt');
        wptElements.forEach((wpt) => {
            const lat = parseFloat(wpt.getAttribute('lat'));
            const lon = parseFloat(wpt.getAttribute('lon'));
            const nameElement = wpt.querySelector('name');
            const descElement = wpt.querySelector('desc');
            const eleElement = wpt.querySelector('ele');

            if (!isNaN(lat) && !isNaN(lon)) {
                const elevation = eleElement ? parseFloat(eleElement.textContent) : null;
                waypoints.push({
                    lat,
                    lon,
                    name: nameElement ? nameElement.textContent : `Waypoint ${waypoints.length + 1}`,
                    description: descElement ? descElement.textContent : '',
                    elevation: isNaN(elevation) ? null : elevation
                });
            }
        });

        return { tracks, waypoints };
    }

    /**
     * Extracts elevation profile data from parsed GPX
     * @param {Object} gpxData - Parsed GPX data from parse()
     * @param {number} trackIndex - Index of track to use (default: 0)
     * @returns {Array<{distance: number, elevation: number, lat: number, lon: number}>}
     *          Array of points with cumulative distance in km and elevation in meters
     */
    function extractElevationData(gpxData, trackIndex = 0) {
        if (!gpxData || !gpxData.tracks || !gpxData.tracks[trackIndex]) {
            throw new Error('Invalid GPX data or track index');
        }

        const track = gpxData.tracks[trackIndex];
        const points = [];
        let cumulativeDistance = 0;

        // Flatten all segments into a single array of points with distances
        track.segments.forEach((segment) => {
            segment.forEach((point, index) => {
                if (index > 0 || points.length > 0) {
                    // Calculate distance from previous point
                    const prevPoint = points.length > 0
                        ? points[points.length - 1]
                        : segment[index - 1];

                    if (prevPoint) {
                        const dist = haversineDistance(
                            prevPoint.lat, prevPoint.lon,
                            point.lat, point.lon
                        );
                        cumulativeDistance += dist;
                    }
                }

                // Only include points with valid elevation
                if (point.elevation !== null) {
                    points.push({
                        distance: cumulativeDistance,
                        elevation: point.elevation,
                        lat: point.lat,
                        lon: point.lon
                    });
                }
            });
        });

        if (points.length < 2) {
            throw new Error('Insufficient elevation data in GPX file (need at least 2 points with elevation)');
        }

        return points;
    }

    /**
     * Extracts waypoints from parsed GPX data and calculates their position along the route
     * @param {Object} gpxData - Parsed GPX data from parse()
     * @param {Array<{distance: number, elevation: number, lat: number, lon: number}>} elevationData - Elevation data points
     * @returns {Array<{name: string, description: string, distance: number, elevation: number, lat: number, lon: number}>}
     */
    function extractWaypoints(gpxData, elevationData) {
        if (!gpxData || !gpxData.waypoints || gpxData.waypoints.length === 0) {
            return [];
        }

        if (!elevationData || elevationData.length < 2) {
            return [];
        }

        const waypoints = [];

        gpxData.waypoints.forEach((wpt) => {
            // Find the closest point on the route to this waypoint
            let minDist = Infinity;
            let closestPointIndex = 0;

            elevationData.forEach((point, index) => {
                const dist = haversineDistance(wpt.lat, wpt.lon, point.lat, point.lon);
                if (dist < minDist) {
                    minDist = dist;
                    closestPointIndex = index;
                }
            });

            // Only include waypoints within 0.5km of the route
            if (minDist <= 0.5) {
                const closestPoint = elevationData[closestPointIndex];
                waypoints.push({
                    name: wpt.name,
                    description: wpt.description || '',
                    distance: closestPoint.distance,
                    elevation: wpt.elevation !== null ? wpt.elevation : closestPoint.elevation,
                    lat: wpt.lat,
                    lon: wpt.lon,
                    routeIndex: closestPointIndex
                });
            }
        });

        // Sort waypoints by distance along the route
        waypoints.sort((a, b) => a.distance - b.distance);

        return waypoints;
    }

    /**
     * Calculates summary statistics for elevation data
     * @param {Array<{distance: number, elevation: number}>} points - Elevation data
     * @param {number} startIndex - Start index for selection (default: 0)
     * @param {number} endIndex - End index for selection (default: end)
     * @returns {Object} Statistics including total distance, gain, loss, min/max elevation
     */
    function calculateStats(points, startIndex = 0, endIndex = null) {
        if (!points || points.length < 2) {
            throw new Error('Need at least 2 points to calculate statistics');
        }

        const end = endIndex !== null ? endIndex : points.length - 1;
        const selectedPoints = points.slice(startIndex, end + 1);

        let totalGain = 0;
        let totalLoss = 0;
        let minElevation = Infinity;
        let maxElevation = -Infinity;

        selectedPoints.forEach((point, index) => {
            // Track min/max elevation
            if (point.elevation < minElevation) minElevation = point.elevation;
            if (point.elevation > maxElevation) maxElevation = point.elevation;

            // Calculate gain/loss from previous point
            if (index > 0) {
                const elevChange = point.elevation - selectedPoints[index - 1].elevation;
                if (elevChange > 0) {
                    totalGain += elevChange;
                } else {
                    totalLoss += Math.abs(elevChange);
                }
            }
        });

        const startDist = selectedPoints[0].distance;
        const endDist = selectedPoints[selectedPoints.length - 1].distance;

        return {
            distance: endDist - startDist,
            startDistance: startDist,
            endDistance: endDist,
            totalGain,
            totalLoss,
            minElevation,
            maxElevation,
            pointCount: selectedPoints.length
        };
    }

    // Public API
    return {
        parse,
        extractElevationData,
        extractWaypoints,
        calculateStats,
        haversineDistance
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPXParser;
}
