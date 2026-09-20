// SPDX-License-Identifier: MIT
import QtQuick
import "../code/Hub.js" as Hub

// A nonvisual, read-only localhost client. No processes, audio capture or writes.
Item {
    id: client
    width: 0
    height: 0
    visible: false

    property string hubUrl: "http://127.0.0.1:27003/"
    property string deviceSerial: ""
    property string connectionState: "checking"
    property int muteStatus: -1
    property int batteryLevel: -1
    property string detail: "Checking OpenLinkHub headset status..."
    property double nowMs: Date.now()
    property double lastStatusAt: 0
    property var pendingRequest: null
    readonly property bool connected: connectionState === "connected"
    readonly property bool micMuted: connected && muteStatus === 1

    function applyStatus(reading) {
        muteStatus = reading.mute;
        batteryLevel = reading.level;
        connectionState = reading.state;
        detail = reading.detail;
        if (reading.rediscover) deviceSerial = "";
    }

    function fail(message) {
        applyStatus(Hub.failure(message, false));
    }

    function cancelRequest() {
        requestTimeout.stop();
        var request = pendingRequest;
        pendingRequest = null;
        if (request) {
            request.onreadystatechange = function() {};
            request.abort();
        }
    }

    function poll() {
        nowMs = Date.now();
        // Also clear old live/mute indications after suspend or an event-loop gap.
        if (lastStatusAt > 0 && (nowMs - lastStatusAt > 10000 || nowMs < lastStatusAt)) {
            lastStatusAt = 0;
            fail("Waiting for fresh OpenLinkHub status...");
        }
        if (pendingRequest !== null) return;

        var discovering = deviceSerial.length === 0;
        var path = discovering ? "/api/" : "/api/devices/" + encodeURIComponent(deviceSerial);
        var url = hubUrl.replace(/\/+$/, "") + path + "?vxtPoll=" + nowMs;
        var request = new XMLHttpRequest();
        pendingRequest = request;
        request.onreadystatechange = function() {
            if (request.readyState !== XMLHttpRequest.DONE || client.pendingRequest !== request) return;
            requestTimeout.stop();
            client.pendingRequest = null;
            client.nowMs = Date.now();

            if (request.status !== 200) {
                if (request.status === 404) client.deviceSerial = "";
                client.fail(request.status === 0
                    ? "OpenLinkHub is unreachable; headset status and battery are unavailable."
                    : "OpenLinkHub returned HTTP " + request.status + "; headset status is unknown.");
                return;
            }

            if (discovering) {
                var found = Hub.discover(request.responseText);
                if (found.state === "found") {
                    client.deviceSerial = found.serial;
                    client.poll();
                } else {
                    client.applyStatus(found);
                }
                return;
            }

            var reading = Hub.parseDevice(request.responseText);
            client.applyStatus(reading);
            if (reading.state === "connected" || reading.state === "disconnected") {
                client.lastStatusAt = client.nowMs;
            }
        };

        try {
            request.open("GET", url, true);
            request.setRequestHeader("Accept", "application/json");
            request.setRequestHeader("Cache-Control", "no-cache");
            requestTimeout.restart();
            request.send();
        } catch (error) {
            cancelRequest();
            fail("Could not request OpenLinkHub status. It will retry automatically.");
        }
    }

    Timer {
        id: pollTimer
        interval: client.connectionState === "error" || client.connectionState === "absent" ? 5000 : 2000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: client.poll()
    }

    Timer {
        id: requestTimeout
        interval: 3000
        repeat: false
        onTriggered: {
            client.cancelRequest();
            client.fail("OpenLinkHub request timed out; headset status and battery are unavailable.");
        }
    }

    Component.onDestruction: {
        pollTimer.stop();
        cancelRequest();
    }
}
