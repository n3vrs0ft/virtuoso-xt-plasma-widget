# Contributing

Thanks for helping with Virtuoso XT Plasma Widget, a small AI-assisted hobby
project with limited hardware coverage and best-effort support.

## Bug reports

Use this repository's issue tracker. Include widget version, distribution,
Plasma version, connection mode, OpenLinkHub version, expected/actual behavior
and reproduction steps. Compare the panel with the detailed OpenLinkHub device
API, not the separate batteryStats summary. The README's optional diagnostic
prints only battery, connection, and mute status without the device serial.

Redact serials, personal paths, usernames, IP addresses and credentials. Do not
upload whole OpenLinkHub profiles/configuration or unrelated desktop screenshots.
Never post tokens, SSH private keys or passwords.

Please do not send widget problems directly to OpenLinkHub or HeadsetControl.
HeadsetControl is not used by 1.2.0 or later. Reproduce suspected dependency issues
outside this widget and follow that project's reporting guidance.

## Changes

Keep changes focused, explain the behavior and add regression tests. Run
`node tests/test.js` and check on real hardware where possible. Clearly
separate mocked tests from live results. Keep the status path read-only, local
and bounded. Do not add microphone monitoring or unnecessary USB pollers.
Never put real identifiers in test data or claim untested headset support.

Before tagging 1.3.0, validate the new icon and tooltip against the documented
bands, then recheck physical mute, off/reconnect, unavailable state and
click-to-open. A raw value may change within a band without changing the icon.
Use code tests for boundary cases that have not been observed on real hardware;
do not label mocked checks as hardware validation. Record results accurately.
A changing number or a plausible color is not proof of battery calibration.
The coarser display must not be described as fixing upstream report errors.

AI-assisted contributions are welcome. Disclose substantial AI assistance,
review the output, and report what was actually tested. Preserve third-party
license notices when incorporating code; dependency links are not substitutes
for license compliance.
