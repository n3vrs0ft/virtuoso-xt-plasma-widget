# Virtuoso XT Plasma Widget

An **unofficial KDE Plasma 6 panel widget** for the **Corsair Virtuoso XT Wireless**
headset. Shows an **approximate three-level battery icon**, physical microphone
mute, and connection status. Click it to open OpenLinkHub.

> **Requires [OpenLinkHub](https://github.com/jurkovic-nikola/OpenLinkHub), installed
> separately, running locally, and already working with your headset.**
>
> OpenLinkHub is developed by **[Nikola / @jurkovic-nikola](https://github.com/jurkovic-nikola)**
> and its contributors. They provide the hardware support and local API this
> widget depends on. Please credit and support their work.
>
> This is an independent companion widget, **not an official OpenLinkHub or
> Corsair product**. It does not bundle, install, or replace OpenLinkHub.
> **HeadsetControl is not required or run by this version.**

**Version:** 1.3.0 · **License:** MIT · **Maintainer:** n3vrs0ft

[Release downloads](https://github.com/n3vrs0ft/virtuoso-xt-plasma-widget/releases)
· [Report a widget issue](https://github.com/n3vrs0ft/virtuoso-xt-plasma-widget/issues)

## At a glance

| Appearance | Meaning | Underlying OpenLinkHub value |
|---|---|---|
| Red battery, one filled bar | Low estimate | 0–20 |
| Yellow battery, two filled bars | Medium estimate | 21–60 |
| Green battery, three filled bars | High estimate, not necessarily full | 61–100 |
| Dimmed headphones and `--` | Headset off/disconnected or not listed | No connected headset |
| Grey battery with `?` | Battery/status information unavailable | Invalid/missing value, initial check, or failed/stale API response |
| Crossed-out microphone in the theme's alert color (usually red) | Physical headset mic muted | `MuteStatus: 1` |

The headphone icon remains beside the battery indicator. The separate mute
indicator does not replace the battery. An unknown mute state is shown with a
separate `?`, never assumed unmuted. Different battery fill levels supplement
color, and the tooltip describes the state in words.

**No numeric battery percentage appears in the panel or normal tooltip.**
A change such as 49 → 48 intentionally stays yellow: both values are in the same
band. The indicator changes band at the thresholds above, not at every raw
battery change. These are **widget display choices, not verified Corsair factory
low/medium/high thresholds**. In-range numeric inputs are rounded to an integer
before classification.

The tooltip shows the approximate state, source, version, and last successful
API-response time. Clicking or activating the widget with Enter/Space opens the
local OpenLinkHub dashboard. There is **no charging indicator** and no microphone
recording, activity meter, separate daemon, or direct USB access.

Mute refers to the **headset's physical microphone button**, not Discord,
TeamSpeak, game, or system-mixer mute. It does not indicate whether an application
is recording and should not be treated as a recording/privacy guarantee.

## Important battery limitation

This widget **groups OpenLinkHub's reported number into three bands**. It does
not measure, calibrate, or correct the battery estimate. It does not claim that
the headset only supplies three levels.

On the development setup, the detailed API reading decreased during use, but
also jumped from 70 to 49 after a headset power cycle. It remained 49 through a
service restart and later decreased to 48. The exact charge and cause of the
jump have **not** been independently established.

A coarser icon avoids presenting an unverified estimate as an exact percentage;
it **does not fix source errors**. Incorrect source data can still select the
wrong band or cause a color change after reconnecting. No smoothing, forced
countdown, or artificial downward trend hides those changes. A green icon does
not prove a full charge. Use the headset's own warning/charging LED as an
additional cue, not this widget alone for critical battery decisions.

The battery source is **`device.BatteryLevel` from the detailed device endpoint**,
not `/api/batteryStats`. Earlier development explored HeadsetControl, but its
reading remained constant on this particular setup. This is not a general claim
about that project's quality or other hardware.

## Requirements

- **KDE Plasma 6**, including normal QtQuick, Plasma Components, and Kirigami QML
  modules. Plasma 5 and non-Plasma desktops are not supported.
- **[OpenLinkHub](https://github.com/jurkovic-nikola/OpenLinkHub)** accessible at
  **`http://127.0.0.1:27003/`**, detecting the actual **VIRTUOSO XT**, not merely its
  receiver. Its detailed response must supply `Connected`, `MuteStatus`, and a
  numeric `BatteryLevel` for all indicators to work.
- The **Corsair Virtuoso XT wireless USB-receiver** setup. Other headsets,
  wired/Bluetooth modes, and multiple matching headsets are not validated.

Install OpenLinkHub using upstream or distribution instructions and confirm the
headset responds in its WebUI first. Package/service names and device
permissions vary; this widget does not change them. Do not run Plasma as root
or grant every HID device world-writable access.

There is no custom host/port/authentication or headset-selection settings page
in this version. No router port forwarding is needed. **HeadsetControl, Python,
Node.js, curl, and the Plasma 5 Support executable engine are not runtime
requirements of the prebuilt widget.** Python and Node.js are optional
manual-diagnostic/development tools.

## Install

Download **`virtuoso-xt-plasma-widget-1.3.0.plasmoid`** from the
[release assets](https://github.com/n3vrs0ft/virtuoso-xt-plasma-widget/releases).
Save it in Downloads and **do not extract the `.plasmoid`**.

Run as your normal user, **without sudo**:

```sh
kpackagetool6 --type Plasma/Applet --install "$HOME/Downloads/virtuoso-xt-plasma-widget-1.3.0.plasmoid"
```

Enter panel **Edit Mode → Add Widgets**, search for **Virtuoso XT Plasma Widget**,
and drag it onto the panel. This command also works in fish. Previous fresh
installations appeared without restarting Plasma; see troubleshooting if the
new widget does not appear.

## Upgrade

The package ID remains **`io.github.n3vrs0ft.virtuosoxt`**. Back up the installed
package before upgrading when practical, then run:

```sh
kpackagetool6 --type Plasma/Applet --upgrade "$HOME/Downloads/virtuoso-xt-plasma-widget-1.3.0.plasmoid"
```

Plasma may retain the old widget code in memory. On systems providing
`plasma-plasmashell.service`, this command reloads the desktop shell:

```sh
systemctl --user restart plasma-plasmashell.service
```

The panel and desktop briefly disappear. Alternatively, save work and log out
and back in. Do not restart KWin or delete panel configuration. Confirm the
widget tooltip says **1.3.0**. A numeric percentage still visible in the panel
usually means an older runtime or an old widget instance remains loaded.

## How updates work

The widget discovers exactly one visible Virtuoso XT through `GET /api/`, then
reads `GET /api/devices/<discovered-headset-serial>` approximately every **2
seconds**. Connection, physical mute, and battery come from that same response.
The client is unchanged from 1.2.0; only the battery presentation is different.

Requests are asynchronous, non-overlapping, read-only, and bounded by a
**3-second timeout**. Errors/absence use a **5-second retry interval**. A failed
request clears the current readings. Responses more than **10 seconds** old
are invalidated when the client next runs, including after a suspend gap.
Disconnected status overrides any retained battery and mute fields. Unknown
battery alone does not prevent a valid physical mute indicator from working.

**The tooltip's API-response time is not a battery measurement timestamp.**
OpenLinkHub may serve a retained value, and headset battery reports may arrive
less frequently than the widget polls. The consumed fields do not establish
sensor freshness or exact calibration.

## Tested scope and release checks

The development setup is **CachyOS / KDE Plasma 6 / Wayland**, **OpenLinkHub
0.9.1**, and a **Corsair Virtuoso XT Wireless receiver**. The user verified the
1.2.0 API-based panel, physical mute/unmute, off/reconnect, and click-to-open.
The panel matched the detailed API across a reconnect jump, and a later source
decrease was observed. These observations are not calibration testing.

**1.3.0's icon presentation is a local test build until its new display has been
checked on the desktop.** Automated parser, mocked-request, threshold and source
checks pass; they do not instantiate Plasma, validate QML bindings/rendering, or
measure physical battery charge. See [CHANGELOG.md](CHANGELOG.md).

Before publishing a release, recheck the new battery icon, physical mute, off
state, reconnect, unavailable state, and click-to-open. Record what was actually
tested; do not claim other hardware/distributions or all battery ranges were
validated on real hardware just because the code tests pass.

## Troubleshooting

**The battery stays yellow:** expected while the reported value remains in
21–60. Hover for the approximate state and API-response time. The raw reading
can decrease without crossing a band boundary.

**Grey battery with `?`:** hover for the reason. Confirm OpenLinkHub is reachable,
the actual headset is detected, and the detailed response is valid. An error is
not reported as green, zero, or a stale battery level.

**Dimmed `--`:** the headset is off/disconnected or not listed. If this is wrong,
compare the connection field outside the widget. A reachable API is not proof
that the headset is connected.

**Battery jumps or seems wrong:** compare the detailed API with the thresholds
above. If the icon matches the source band, the widget is not recalculating the
charge. Report source inconsistencies separately and respectfully; do not mask
them with invented values. The exact battery charge remains unverified.

**Mute differs from Discord:** only physical headset mute is shown. A `?`
indicates unavailable status, not permission to assume a microphone is muted.

**Widget missing from Add Widgets:** confirm installation succeeded, close and
reopen Add Widgets, then log out/in if necessary. Do not remove unrelated
widgets. A missing QML module needs the corresponding distribution package.

### Optional concise API diagnostic

Python 3 is needed **only for this manual check**, not by the widget. This
read-only command auto-discovers the headset, prints status and the raw battery
number for troubleshooting, and avoids printing serials or RGB configuration.
It works in fish as well as Bash-like shells.

```sh
python3 -c '
import json, re, sys
from urllib.parse import quote
from urllib.request import build_opener, ProxyHandler
base = "http://127.0.0.1:27003"
opener = build_opener(ProxyHandler({}))
def get(path):
    with opener.open(base + path, timeout=5) as response:
        result = json.load(response)
    if not isinstance(result, dict) or result.get("code") != 200:
        raise ValueError("Unexpected API response")
    return result
try:
    devices = get("/api/").get("device", {})
    matches = []
    for key, dev in devices.items():
        if isinstance(dev, dict) and dev.get("Hidden") is not True and re.fullmatch(r"(?:CORSAIR\s+)?VIRTUOSO\s+XT", str(dev.get("Product", "")).strip(), re.I):
            matches.append(dev.get("Serial") or key)
    if len(matches) != 1:
        raise ValueError("Expected exactly one Virtuoso XT")
    dev = get("/api/devices/" + quote(matches[0], safe="")).get("device")
    if not isinstance(dev, dict):
        raise ValueError("Headset details unavailable")
    print("Connected:", dev.get("Connected"))
    print("MuteStatus:", dev.get("MuteStatus"))
    print("BatteryLevel (raw estimate):", dev.get("BatteryLevel"))
    if dev.get("Connected") is not True:
        print("Disconnected/unknown: ignore retained battery and mute values.")
except Exception:
    sys.exit("Could not read headset status. Check OpenLinkHub and device detection.")
'
```

## Privacy

The widget makes local API GET requests and opens the local dashboard on click.
It does not record audio, invoke a battery subprocess, add a service, open a
listening port, write API settings, or upload telemetry. The discovered device
identifier is kept in memory for local requests; tests use fictional identifiers.
OpenLinkHub's own permissions and behavior are separate.

Redact serials, personal paths, usernames, addresses and credentials before
sharing logs or screenshots. Do not publish whole OpenLinkHub profiles. Review
widget code as you would other installed software; these statements are not a
security audit or a guarantee against bugs.

## Development and AI disclosure

I'm not a programmer. I created this for my own Linux setup with the assistance
of AI (ChatGPT), then tested and iterated on real hardware.

I'm sharing it because it may help other Virtuoso XT users. AI assistance is
not a substitute for review and testing. This is a hobby project with limited
hardware coverage and best-effort support. Bug reports, review and contributions
are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits and support etiquette

**[OpenLinkHub](https://github.com/jurkovic-nikola/OpenLinkHub)** — by
**[Nikola / @jurkovic-nikola](https://github.com/jurkovic-nikola)** and contributors.
Thank you for Linux Corsair hardware support and the local API that supplies
**all headset status in this widget**. **OpenLinkHub must be installed separately
and running.** These features depend on that work.

**[HeadsetControl](https://github.com/Sapd/HeadsetControl)** — by
**[@Sapd](https://github.com/Sapd)** and contributors. Thank you for the integration
tools explored during development. Version 1.1.0 used it; **1.2.0 and later do
not require or run it**. Observations on one setup are not a general judgment
about the project.

**[KDE](https://kde.org/)** and **[Qt](https://www.qt.io/)** — thanks to their
communities for the desktop, widget framework, and UI components.

This project is independent and unofficial. It is **not affiliated with,
endorsed by, or maintained by Corsair, OpenLinkHub, HeadsetControl, KDE, or Qt**.
Names identify compatibility and dependencies, not endorsement.

Report widget issues in **[this repository](https://github.com/n3vrs0ft/virtuoso-xt-plasma-widget/issues)**,
not automatically upstream. Reproduce a suspected dependency problem outside
the widget and follow that project's reporting guidance before filing a report.
Please respect volunteer maintainers.

## Tests and packaging

Developers can use Node.js 18+ and Python 3.9+:

```sh
node tests/test.js
python3 build.py
```

Tests cover parsing, all integer band boundaries, invalid/stale/offline state,
color/fill source definitions, and mocked execution of the actual client's
JavaScript methods. They **do not** run Qt/Plasma or real USB hardware. `build.py`
creates `dist/virtuoso-xt-plasma-widget-1.3.0.plasmoid` from an explicit allowlist,
not arbitrary local files or repository history. The prebuilt widget does not
need Node.js or Python at runtime.

## Remove

Remove the panel instance, then run:

```sh
kpackagetool6 --type Plasma/Applet --remove io.github.n3vrs0ft.virtuosoxt
```

This does not uninstall or modify OpenLinkHub or HeadsetControl.

## License

This widget uses the **MIT license**; see [LICENSE](LICENSE). Dependencies keep
their own licenses; their code and binaries are not bundled or relicensed here.
