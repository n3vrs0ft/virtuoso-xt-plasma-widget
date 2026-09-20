.pragma library

// SPDX-License-Identifier: MIT
// Read the actual headset's detailed API response. Never use batteryStats,
// invent a level, or keep a disconnected device's retained battery value.
function object(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function failure(detail, rediscover) {
    return {state: "error", mute: -1, level: -1, detail: detail, rediscover: !!rediscover};
}

function decode(text) {
    try {
        var value = JSON.parse(String(text));
        return object(value) ? value : null;
    } catch (error) {
        return null;
    }
}

function validLevel(value) {
    // OpenLinkHub's BatteryLevel is a JSON number. Reject null, strings, missing
    // fields and out-of-range values rather than converting them into a battery reading.
    if (typeof value !== "number" || !isFinite(value) || value < 0 || value > 100) return -1;
    return Math.round(value);
}

function discover(text) {
    var payload = decode(text);
    if (!payload || payload.code !== 200 || !object(payload.device)) {
        return failure("OpenLinkHub returned an invalid device list.", false);
    }
    var matches = [];
    Object.keys(payload.device).forEach(function(key) {
        var device = payload.device[key];
        if (!object(device) || device.Hidden === true) return;
        // Exclude the receiver; the actual headset exposes the status fields.
        if (!/^(?:CORSAIR\s+)?VIRTUOSO\s+XT$/i.test(String(device.Product || "").trim())) return;
        var serial = typeof device.Serial === "string" ? device.Serial : key;
        if (serial.length > 0 && serial.length <= 128) matches.push(serial);
    });
    if (matches.length === 1) return {state: "found", serial: matches[0]};
    if (matches.length > 1) return failure("More than one Virtuoso XT is listed; headset selection is ambiguous.", false);
    return {state: "absent", mute: -1, level: -1, detail: "Virtuoso XT is not listed by OpenLinkHub.", rediscover: true};
}

function parseDevice(text) {
    var payload = decode(text);
    if (!payload || payload.code !== 200) {
        return failure("OpenLinkHub did not return valid headset status.", !!payload && payload.code === 404);
    }
    if (!object(payload.device)) {
        return failure("Headset details are unavailable; rediscovering the headset.", true);
    }
    var device = payload.device;
    if (device.Connected === false) {
        // OpenLinkHub can retain both these values after the headset turns off.
        return {state: "disconnected", mute: -1, level: -1, detail: "Headset is off or disconnected.", rediscover: false};
    }
    if (device.Connected !== true) {
        return failure("OpenLinkHub did not report a valid connection state.", false);
    }
    var mute = device.MuteStatus === 0 || device.MuteStatus === 1 ? device.MuteStatus : -1;
    var level = validLevel(device.BatteryLevel);
    var detail = mute === 1 ? "Headset microphone: MUTED."
        : mute === 0 ? "Headset microphone: unmuted. App mute settings may differ."
        : "Headset connected; microphone mute state is unavailable.";
    if (level < 0) detail += "\nOpenLinkHub did not return a valid battery reading.";
    return {state: "connected", mute: mute, level: level, detail: detail, rediscover: false};
}

// These bands are widget display choices, not Corsair factory thresholds.
// A coarser display does not correct upstream battery estimates. Do not smooth,
// force a trend, infer charging, or hide a category change after reconnection.
function batteryPresentation(level, sampledAt, now, connectionState) {
    var age = now - sampledAt;
    if (connectionState === "disconnected" || connectionState === "absent") {
        return {band: "disconnected", label: "Off / disconnected", bars: 0};
    }
    if (connectionState !== "connected" || sampledAt <= 0 || age < 0 || age > 10000) {
        return {band: "unknown", label: "Unavailable", bars: 0};
    }
    var valid = validLevel(level);
    if (valid < 0) return {band: "unknown", label: "Unavailable", bars: 0};
    if (valid <= 20) return {band: "low", label: "Low", bars: 1};
    if (valid <= 60) return {band: "medium", label: "Medium", bars: 2};
    return {band: "high", label: "High", bars: 3};
}
