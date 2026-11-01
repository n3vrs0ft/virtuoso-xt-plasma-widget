// SPDX-License-Identifier: MIT
import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PlasmaComponents3
import org.kde.plasma.plasmoid
import "../code/Hub.js" as Hub

PlasmoidItem {
    id: root

    readonly property var batteryDisplay: Hub.batteryPresentation(hub.batteryLevel, hub.lastStatusAt,
                                                                 hub.nowMs, hub.connectionState)
    readonly property bool showDisconnected: batteryDisplay.band === "disconnected"
    readonly property bool showMuteIndicator: hub.connected && hub.muteStatus !== 0
    readonly property string hubUrl: "http://127.0.0.1:27003/"
    // Only show a number when the same freshness and connection checks used
    // by the coloured panel indicator have succeeded.
    readonly property string hoverBattery: batteryDisplay.bars > 0
        ? String(hub.batteryLevel) + "% (OpenLinkHub estimate; " + batteryDisplay.label + ")"
        : batteryDisplay.label
    readonly property string hoverStatus: hub.connectionState === "error"
        ? "OpenLinkHub status unavailable. Check whether its service is running."
        : hub.detail

    // Virtuoso XT service recovery actions (optional handler)
    Plasmoid.contextualActions: [
        PlasmaCore.Action {
            text: "Start OpenLinkHub (administrator)"
            icon.name: "media-playback-start"
            onTriggered: Qt.openUrlExternally("virtuosoxt-service://start")
        },
        PlasmaCore.Action {
            text: "Restart OpenLinkHub (administrator)"
            icon.name: "view-refresh"
            onTriggered: Qt.openUrlExternally("virtuosoxt-service://restart")
        },
        PlasmaCore.Action {
            text: "Enable at Startup and Start (administrator)"
            icon.name: "system-run"
            onTriggered: Qt.openUrlExternally("virtuosoxt-service://enable")
        }
    ]

    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground
    preferredRepresentation: fullRepresentation
    activationTogglesExpanded: false
    toolTipMainText: "Corsair Virtuoso XT"
    toolTipTextFormat: Text.PlainText
    toolTipSubText: hub.detail
        + "\nBattery: " + root.batteryDisplay.label
        + (root.batteryDisplay.bars > 0 ? " (approximate OpenLinkHub reading)." : ".")
        + "\nSource: OpenLinkHub device API. The estimate may jump after reconnecting."
        + (hub.lastStatusAt > 0
            ? "\nLast successful API response: "
                + Qt.formatTime(new Date(hub.lastStatusAt), "hh:mm:ss") : "")
        + "\nReads OpenLinkHub every 2 seconds; device reports may update less often."
        + "\nClick to open OpenLinkHub. Virtuoso XT Plasma Widget 1.4.0."

    HubStatus {
        id: hub
        hubUrl: root.hubUrl
    }

    fullRepresentation: MouseArea {
        id: display
        readonly property bool verticalPanel: Plasmoid.formFactor === PlasmaCore.Types.Vertical
        readonly property real indicatorSpace: root.showMuteIndicator
            ? micIndicator.width + Kirigami.Units.smallSpacing : 0
        readonly property real iconRowWidth: headsetIcon.width + indicatorSpace
        readonly property real contentWidth: verticalPanel
            ? Math.max(iconRowWidth, batterySlot.width)
            : headsetIcon.width + batterySlot.width + Kirigami.Units.smallSpacing + indicatorSpace
        readonly property real contentHeight: verticalPanel
            ? headsetIcon.height + batterySlot.height + Kirigami.Units.smallSpacing
            : Math.max(headsetIcon.height, batterySlot.height)

        implicitWidth: contentWidth + Kirigami.Units.smallSpacing * 2
        implicitHeight: contentHeight + Kirigami.Units.smallSpacing * 2
        Layout.minimumWidth: implicitWidth
        Layout.preferredWidth: implicitWidth
        Layout.maximumWidth: verticalPanel ? Infinity : implicitWidth
        Layout.minimumHeight: implicitHeight
        Layout.preferredHeight: implicitHeight
        Layout.maximumHeight: verticalPanel ? implicitHeight : Infinity
        hoverEnabled: true
        acceptedButtons: Qt.LeftButton
        cursorShape: Qt.PointingHandCursor
        activeFocusOnTab: true
        Accessible.role: Accessible.Button
        Accessible.name: "Corsair Virtuoso XT. " + hub.detail
            + " Battery: " + root.batteryDisplay.label
            + (root.batteryDisplay.bars > 0 ? ", approximate estimate." : ".")
        Accessible.description: "Open OpenLinkHub headset controls"
        onClicked: Qt.openUrlExternally(root.hubUrl)
        Keys.onReturnPressed: Qt.openUrlExternally(root.hubUrl)
        Keys.onSpacePressed: Qt.openUrlExternally(root.hubUrl)

        // Explicit tooltip hover target for custom full-size MouseArea panels.
        // Do not replace click handling or create another overlapping MouseArea.
        PlasmaCore.ToolTipArea {
            id: virtuosoHoverTooltip
            anchors.fill: parent
            z: -1
            mainText: "Corsair Virtuoso XT"
            subText: "Battery: " + root.hoverBattery
                + "\n" + root.hoverStatus
                + "\nSource: OpenLinkHub detailed device API; charge is not calibrated."
            textFormat: Text.PlainText
            active: true
        }

        Rectangle {
            anchors.fill: parent
            radius: Kirigami.Units.smallSpacing
            color: Kirigami.Theme.highlightColor
            opacity: display.containsMouse || display.activeFocus ? 0.14 : 0
        }

        Item {
            width: display.contentWidth
            height: display.contentHeight
            anchors.centerIn: parent

            Kirigami.Icon {
                id: headsetIcon
                source: "audio-headset"
                width: Kirigami.Units.iconSizes.smallMedium
                height: width
                x: display.verticalPanel ? (parent.width - display.iconRowWidth) / 2 : 0
                y: display.verticalPanel ? 0 : (parent.height - height) / 2
                opacity: hub.connected ? 1 : 0.4
            }

            Item {
                id: micIndicator
                width: Kirigami.Units.iconSizes.small
                height: width
                visible: root.showMuteIndicator
                x: display.verticalPanel
                    ? headsetIcon.x + headsetIcon.width + Kirigami.Units.smallSpacing
                    : batterySlot.x + batterySlot.width + Kirigami.Units.smallSpacing
                y: display.verticalPanel ? (headsetIcon.height - height) / 2
                    : (parent.height - height) / 2

                Kirigami.Icon {
                    anchors.fill: parent
                    visible: hub.micMuted
                    source: "microphone-sensitivity-muted"
                    isMask: true
                    color: Kirigami.Theme.negativeTextColor
                }

                PlasmaComponents3.Label {
                    anchors.centerIn: parent
                    visible: hub.connected && hub.muteStatus === -1
                    text: "?"
                    font.bold: true
                    color: Kirigami.Theme.neutralTextColor
                }
            }

            Item {
                id: batterySlot
                width: Math.round(Kirigami.Units.iconSizes.smallMedium * 1.5)
                height: Kirigami.Units.iconSizes.smallMedium
                x: display.verticalPanel ? (parent.width - width) / 2
                    : headsetIcon.width + Kirigami.Units.smallSpacing
                y: display.verticalPanel ? headsetIcon.height + Kirigami.Units.smallSpacing
                    : (parent.height - height) / 2

                BatteryIndicator {
                    anchors.fill: parent
                    band: root.batteryDisplay.band
                    visible: !root.showDisconnected
                }

                PlasmaComponents3.Label {
                    anchors.centerIn: parent
                    text: "--"
                    textFormat: Text.PlainText
                    font.bold: true
                    font.pointSize: Kirigami.Theme.defaultFont.pointSize + 1
                    color: Kirigami.Theme.textColor
                    opacity: 0.5
                    visible: root.showDisconnected
                }
            }
        }
    }
}
