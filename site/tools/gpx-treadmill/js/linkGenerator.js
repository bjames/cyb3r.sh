/**
 * Link Generator Module
 * Encodes/decodes elevation data into compact URL-safe strings
 * for sharing routes without the original GPX file.
 *
 * Binary format:
 *   Version (1B) | Point count (2B uint16 BE) | First elevation (2B int16 BE) |
 *   Waypoint count (1B) | Elevation deltas (variable) | Waypoints (variable)
 *
 * Elevation deltas: if |delta| <= 127 → 1 byte (delta+127, range 0-254),
 *   else 0xFF marker + int16 BE (3 bytes total)
 *
 * Waypoints: per wpt → index (2B uint16 BE) + name length (1B) + name (ASCII bytes)
 *
 * Base62 encoding: 2 bytes → 3 chars (62^3 = 238328 > 65535),
 *   trailing odd byte → 2 chars
 */
const LinkGenerator = (function() {
    'use strict';

    const FORMAT_VERSION = 0x01;
    const INTERVAL_METERS = 100;
    const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    /**
     * Returns the base62 integer value of a character
     * @param {string} ch - Single character
     * @returns {number} Integer value 0-61
     */
    function base62Value(ch) {
        const code = ch.charCodeAt(0);
        // '0'-'9' → 0-9
        if (code >= 48 && code <= 57) return code - 48;
        // 'A'-'Z' → 10-35
        if (code >= 65 && code <= 90) return code - 55;
        // 'a'-'z' → 36-61
        if (code >= 97 && code <= 122) return code - 61;
        throw new Error('Invalid base62 character: ' + ch);
    }

    /**
     * Encodes a byte array to a base62 string
     * Processes 2 bytes at a time into 3 base62 characters.
     * A trailing single byte is encoded as 2 characters.
     * @param {Uint8Array} bytes - Input bytes
     * @returns {string} Base62-encoded string
     */
    function bytesToBase62(bytes) {
        var result = '';
        var i = 0;
        for (; i + 1 < bytes.length; i += 2) {
            var val = (bytes[i] << 8) | bytes[i + 1];
            result += BASE62_CHARS[Math.floor(val / 3844)];
            result += BASE62_CHARS[Math.floor((val % 3844) / 62)];
            result += BASE62_CHARS[val % 62];
        }
        // Handle trailing odd byte
        if (i < bytes.length) {
            var val2 = bytes[i];
            result += BASE62_CHARS[Math.floor(val2 / 62)];
            result += BASE62_CHARS[val2 % 62];
        }
        return result;
    }

    /**
     * Decodes a base62 string back to a byte array
     * Processes 3 chars at a time into 2 bytes.
     * A trailing pair of chars decodes to 1 byte.
     * @param {string} str - Base62-encoded string
     * @returns {Uint8Array} Decoded bytes
     */
    function base62ToBytes(str) {
        var bytes = [];
        var i = 0;
        for (; i + 2 < str.length; i += 3) {
            var val = base62Value(str[i]) * 3844 +
                      base62Value(str[i + 1]) * 62 +
                      base62Value(str[i + 2]);
            bytes.push((val >> 8) & 0xFF);
            bytes.push(val & 0xFF);
        }
        // Handle trailing 2-char group (1 byte)
        if (i + 1 < str.length) {
            var val2 = base62Value(str[i]) * 62 + base62Value(str[i + 1]);
            bytes.push(val2 & 0xFF);
        }
        return new Uint8Array(bytes);
    }

    /**
     * Simplifies elevation data to exactly 100m intervals via linear interpolation.
     * Elevations are rounded to the nearest meter.
     * @param {Array<{distance: number, elevation: number}>} elevationData - Source points (distance in km)
     * @returns {Array<number>} Elevations at 100m intervals (meters, integers)
     */
    function simplifyElevationData(elevationData) {
        if (!Array.isArray(elevationData) || elevationData.length < 2) {
            throw new Error('Elevation data must have at least 2 points');
        }

        var totalDistanceKm = elevationData[elevationData.length - 1].distance;
        var totalDistanceM = totalDistanceKm * 1000;
        var pointCount = Math.floor(totalDistanceM / INTERVAL_METERS) + 1;

        // Routes shorter than 100m: just return start and end elevations
        if (pointCount < 2) {
            return [
                Math.round(elevationData[0].elevation),
                Math.round(elevationData[elevationData.length - 1].elevation)
            ];
        }

        var result = [];
        var srcIdx = 0;

        for (var i = 0; i < pointCount; i++) {
            var targetKm = (i * INTERVAL_METERS) / 1000;

            // Advance srcIdx so source[srcIdx] <= targetKm < source[srcIdx+1]
            while (srcIdx < elevationData.length - 2 &&
                   elevationData[srcIdx + 1].distance <= targetKm) {
                srcIdx++;
            }

            var p0 = elevationData[srcIdx];
            var p1 = elevationData[srcIdx + 1];
            var segLen = p1.distance - p0.distance;
            var t = segLen > 0 ? (targetKm - p0.distance) / segLen : 0;
            t = Math.max(0, Math.min(1, t));

            var elev = p0.elevation + t * (p1.elevation - p0.elevation);
            result.push(Math.round(elev));
        }

        return result;
    }

    /**
     * Packs simplified elevations and waypoints into a binary byte array
     * @param {Array<number>} elevations - Integer elevations at 100m intervals
     * @param {Array<{name: string, distance: number}>} waypoints - Waypoints to encode
     * @returns {Uint8Array} Packed binary data
     */
    function encodeToBytes(elevations, waypoints) {
        var buf = [];

        // Version
        buf.push(FORMAT_VERSION);

        // Point count (uint16 BE)
        var count = elevations.length;
        buf.push((count >> 8) & 0xFF);
        buf.push(count & 0xFF);

        // First elevation (int16 BE)
        var first = elevations[0];
        buf.push((first >> 8) & 0xFF);
        buf.push(first & 0xFF);

        // Waypoint count
        var wpts = waypoints || [];
        buf.push(Math.min(wpts.length, 255));

        // Elevation deltas
        for (var i = 1; i < elevations.length; i++) {
            var delta = elevations[i] - elevations[i - 1];
            if (delta >= -127 && delta <= 127) {
                buf.push(delta + 127);
            } else {
                buf.push(0xFF);
                // int16 BE
                var signed = delta & 0xFFFF;
                buf.push((signed >> 8) & 0xFF);
                buf.push(signed & 0xFF);
            }
        }

        // Waypoints
        var wptCount = Math.min(wpts.length, 255);
        for (var w = 0; w < wptCount; w++) {
            var wpt = wpts[w];
            // Calculate index: distance (km) → 100m interval index
            var idx = Math.round((wpt.distance * 1000) / INTERVAL_METERS);
            idx = Math.max(0, Math.min(count - 1, idx));
            buf.push((idx >> 8) & 0xFF);
            buf.push(idx & 0xFF);

            // Name: truncate to 255 ASCII bytes
            var name = wpt.name || '';
            var nameBytes = [];
            for (var c = 0; c < name.length && nameBytes.length < 255; c++) {
                var code = name.charCodeAt(c);
                if (code <= 127) {
                    nameBytes.push(code);
                }
            }
            buf.push(nameBytes.length);
            for (var b = 0; b < nameBytes.length; b++) {
                buf.push(nameBytes[b]);
            }
        }

        return new Uint8Array(buf);
    }

    /**
     * Encodes elevation data and waypoints into a compact base62 string
     * @param {Array<{distance: number, elevation: number}>} elevationData - Source points
     * @param {Array<{name: string, distance: number}>} [waypoints] - Optional waypoints
     * @returns {string} Base62-encoded string
     */
    function encode(elevationData, waypoints) {
        var elevations = simplifyElevationData(elevationData);
        var bytes = encodeToBytes(elevations, waypoints);
        return bytesToBase62(bytes);
    }

    /**
     * Decodes a base62 string back into elevation data and waypoints
     * @param {string} base62String - Encoded string
     * @returns {{elevationData: Array<{distance: number, elevation: number}>, waypoints: Array<{name: string, distance: number, elevation: number}>}}
     */
    function decode(base62String) {
        if (!base62String || typeof base62String !== 'string') {
            throw new Error('Invalid encoded data: expected a non-empty string');
        }

        var bytes = base62ToBytes(base62String);
        if (bytes.length < 6) {
            throw new Error('Invalid encoded data: too short');
        }

        var pos = 0;

        // Version
        var version = bytes[pos++];
        if (version !== FORMAT_VERSION) {
            throw new Error('Unsupported format version: ' + version);
        }

        // Point count (uint16 BE)
        var count = (bytes[pos] << 8) | bytes[pos + 1];
        pos += 2;

        // First elevation (int16 BE)
        var firstRaw = (bytes[pos] << 8) | bytes[pos + 1];
        pos += 2;
        // Sign-extend int16
        var firstElev = firstRaw >= 0x8000 ? firstRaw - 0x10000 : firstRaw;

        // Waypoint count
        var wptCount = bytes[pos++];

        // Decode elevation deltas
        var elevations = [firstElev];
        for (var i = 1; i < count; i++) {
            if (pos >= bytes.length) {
                throw new Error('Invalid encoded data: unexpected end of delta data');
            }
            var b = bytes[pos++];
            if (b !== 0xFF) {
                elevations.push(elevations[i - 1] + (b - 127));
            } else {
                // 3-byte large delta
                if (pos + 1 >= bytes.length) {
                    throw new Error('Invalid encoded data: unexpected end of large delta');
                }
                var raw16 = (bytes[pos] << 8) | bytes[pos + 1];
                pos += 2;
                var delta = raw16 >= 0x8000 ? raw16 - 0x10000 : raw16;
                elevations.push(elevations[i - 1] + delta);
            }
        }

        // Reconstruct elevation data with 100m intervals
        var elevationData = [];
        for (var e = 0; e < elevations.length; e++) {
            elevationData.push({
                distance: (e * INTERVAL_METERS) / 1000,
                elevation: elevations[e]
            });
        }

        // Decode waypoints
        var waypoints = [];
        for (var w = 0; w < wptCount; w++) {
            if (pos + 2 >= bytes.length) break;
            var idx = (bytes[pos] << 8) | bytes[pos + 1];
            pos += 2;

            var nameLen = bytes[pos++];
            var name = '';
            for (var n = 0; n < nameLen && pos < bytes.length; n++) {
                name += String.fromCharCode(bytes[pos++]);
            }

            var wptDist = (idx * INTERVAL_METERS) / 1000;
            var wptElev = idx < elevations.length ? elevations[idx] : 0;

            waypoints.push({
                name: name,
                distance: wptDist,
                elevation: wptElev
            });
        }

        return {
            elevationData: elevationData,
            waypoints: waypoints
        };
    }

    /**
     * Generates a full shareable URL with the route encoded as a query parameter
     * @param {Array<{distance: number, elevation: number}>} elevationData - Source points
     * @param {Array<{name: string, distance: number}>} [waypoints] - Optional waypoints
     * @param {string} [routeName] - Optional route name
     * @returns {string} Full URL with ?route= parameter
     */
    function generateLink(elevationData, waypoints, routeName) {
        var encoded = encode(elevationData, waypoints);
        var url = new URL(window.location.href.split('?')[0]);
        url.searchParams.set('route', encoded);
        if (routeName) {
            url.searchParams.set('name', routeName);
        }
        return url.toString();
    }

    /**
     * Checks the current URL for a route parameter and decodes it if present
     * @returns {{elevationData: Array, waypoints: Array, routeName: string|null}|null} Decoded data or null
     */
    function loadFromURL() {
        var params = new URLSearchParams(window.location.search);
        var routeParam = params.get('route');
        if (!routeParam) return null;

        var result = decode(routeParam);
        result.routeName = params.get('name') || null;
        return result;
    }

    // Public API
    return {
        simplifyElevationData: simplifyElevationData,
        encode: encode,
        decode: decode,
        generateLink: generateLink,
        loadFromURL: loadFromURL,
        // Expose internals for testing
        bytesToBase62: bytesToBase62,
        base62ToBytes: base62ToBytes,
        encodeToBytes: encodeToBytes
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkGenerator;
}
