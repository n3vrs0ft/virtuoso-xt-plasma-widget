// SPDX-License-Identifier: MIT
import QtQuick

// Draw the battery locally so its color and fill do not depend on icon-theme
// variants. No percentage, animation, charging inference or external assets.
Item {
    id: battery

    property string band: "unknown"
    readonly property bool hasReading: band === "low" || band === "medium" || band === "high"
    readonly property int activeBars: band === "low" ? 1 : band === "medium" ? 2 : band === "high" ? 3 : 0
    readonly property color indicatorColor: band === "low" ? "#ef5350"
        : band === "medium" ? "#f6c343"
        : band === "high" ? "#63d699" : "#9aa0a6"

    implicitWidth: 32
    implicitHeight: 22

    Rectangle {
        id: terminal
        width: 3
        height: Math.max(4, Math.round(body.height * 0.35))
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        radius: 1
        color: battery.indicatorColor
    }

    Rectangle {
        id: body
        width: parent.width - 4
        height: Math.round(parent.height * 0.65)
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        color: "transparent"
        border.width: 2
        border.color: battery.indicatorColor
        radius: 2
        antialiasing: true

        Row {
            anchors.fill: parent
            anchors.margins: 4
            spacing: 2
            visible: battery.hasReading

            Repeater {
                model: 3
                Rectangle {
                    required property int index
                    width: Math.max(1, (body.width - 12) / 3)
                    height: Math.max(2, body.height - 8)
                    radius: 0.5
                    color: battery.indicatorColor
                    opacity: index < battery.activeBars ? 1 : 0.12
                }
            }
        }

        Text {
            anchors.centerIn: parent
            visible: !battery.hasReading
            text: "?"
            color: battery.indicatorColor
            font.bold: true
            font.pixelSize: Math.max(10, Math.round(body.height * 0.8))
        }
    }
}
