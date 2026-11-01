# Changelog

## 1.4.0 — battery hover tooltip and optional service recovery (2026-11-01)

- Hover tooltip shows the OpenLinkHub detailed API's numeric battery estimate,
  only when a fresh connected reading is available; preserves colour bands in panel.
- Adds right-click Start / Restart / Enable-and-Start service actions.
- Service operations use an optional, separately installed user-owned handler
  and Polkit authorization. No passwordless sudo or special privilege rules.
- Preserves physical mic mute display, existing panel layout and left-click action.
- Tested locally on CachyOS, Plasma 6.8.2, with OpenLinkHub 0.9.4.
- 100 Node.js regression tests and optional URI-handler unit tests; not equivalent to cross-distribution or live hardware validation.
- The release packaging now includes a reproducible source `build.py`, correct 1.4.0 installation documentation and separate optional helper instructions.
- Other distributions and headset connection modes remain untested.

## 1.3.0 — approximate battery icons (local validation build)

- Replace the numeric battery display with a red one-bar low, yellow two-bar
  medium, or green three-bar high battery icon beside the headphones.
- Use rounded OpenLinkHub values 0–20 / 21–60 / 61–100. These are display
  thresholds, not verified Corsair factory bands or calibrated measurements.
- Show grey battery/question-mark for unknown data; retain dimmed `--` when
  off/disconnected and the separate physical microphone-mute indicator.
- Keep the 1.2.0 read-only OpenLinkHub client and package ID unchanged. No
  HeadsetControl, extra process, new daemon, audio capture, or charging inference.
- Describe battery in words in the tooltip and accessible label. Keep the last
  successful API-response time, without claiming a new sensor sample.
- Do not smooth or conceal source changes across bands. The coarser display
  does not correct inaccurate source data; 49 -> 48 stays medium by design.
- Update requirements, upstream credits, AI disclosure, troubleshooting and tests.
- Remove the earlier numeric-panel screenshot so it does not misrepresent 1.3.0.

Automated parser, request, threshold and static UI-source checks pass. Actual
1.3.0 Plasma rendering and live icon behavior still need desktop verification.
Battery calibration remains unverified; no charging indicator is provided.

## 1.2.0 — OpenLinkHub-only battery/status (local validation build)

- Read battery from the actual headset's detailed OpenLinkHub device API,
  alongside connection and physical mute state.
- Remove HeadsetControl invocation, its battery parser, the one-minute battery
  timer, and the Plasma 5 Support executable data-engine requirement.
- Keep the public package ID and panel layout unchanged.
- Use the existing two-second local API poll for all three readings.
- Show the last successful API response time in the tooltip, explicitly not a
  claim that the physical battery sample was taken at that time.
- Reject invalid/missing/out-of-range battery values and ignore retained values
  when the headset is off. Clear status on request failures/timeouts.
- Preserve mute indication, low-battery coloring, and click-to-open OpenLinkHub.
- Update requirements, attribution, diagnostics and privacy documentation.
- Add regression tests for changing battery responses, stale/offline state,
  request recovery, and absence of executable polling.

Reason: on the development setup, HeadsetControl repeatedly returned 59% while
OpenLinkHub's detailed value decreased from 74% to 71%. Stopping OpenLinkHub did
not change HeadsetControl's result. The exact underlying cause is not established.

The user validated the API-based panel and its mute/off/click behavior. A
source jump from 70 to 49 after a headset power cycle was also reflected in
the panel; the API remained at 49 after a service restart and later fell to 48. Battery calibration is not independently verified;
there is no charging indicator or guarantee of upstream sensor freshness.

## 1.1.0 — earlier local/pre-publication build

- Public name: Virtuoso XT Plasma Widget.
- Package ID: `io.github.n3vrs0ft.virtuosoxt`.
- HeadsetControl battery queries every 60 seconds.
- OpenLinkHub connection and physical microphone-mute indication.
- Dimmed `--` when off/disconnected; click opens local OpenLinkHub.
- Required dependencies, upstream credits, AI disclosure and installation docs.

The interface and basic installation were tested; battery-source validation
later identified the persistent 59% reading described above. This historical build should not replace the newer OpenLinkHub-only
implementation.
