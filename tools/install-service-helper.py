#!/usr/bin/env python3
"""Optional UNPRIVILEGED OpenLinkHub service URL handler for Virtuoso XT.

This installs user-owned files only; pkexec requests authorization for each action.
No passwordless privilege rule is installed.
"""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys

APP = 'virtuosoxt-service-handler.desktop'
SCHEME = 'x-scheme-handler/virtuosoxt-service'
HOME = Path.home()
HANDLER = HOME / '.local/bin/virtuosoxt-service-handler'
DESKTOP = HOME / '.local/share/applications' / APP

HANDLER_SOURCE = r'''#!/usr/bin/env python3
"""Strict URL -> authorized systemctl action dispatcher; never runs a shell."""
import subprocess
import sys
from urllib.parse import urlsplit

ACTIONS = {'start': ('start',), 'restart': ('restart',), 'enable': ('enable', '--now')}

def main():
    if len(sys.argv) != 2:
        return 2
    try:
        url = urlsplit(sys.argv[1])
        if (url.scheme != 'virtuosoxt-service' or url.hostname not in ACTIONS
                or url.netloc != url.hostname or url.path or url.query or url.fragment):
            return 2
    except ValueError:
        return 2
    # Do not use sudo, a shell, or caller-supplied service/operation strings.
    result = subprocess.run(['/usr/bin/pkexec', '/usr/bin/systemctl',
                             *ACTIONS[url.hostname], 'openlinkhub.service'], check=False)
    if result.returncode not in (0, 126, 127):
        if __import__('shutil').which('kdialog'):
            subprocess.run(['kdialog', '--error',
                            'OpenLinkHub service action failed. Inspect systemctl status openlinkhub.service.',
                            '--title', 'Virtuoso XT'], check=False)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
'''

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uninstall', action='store_true')
    args = parser.parse_args()
    if args.uninstall:
        current = subprocess.run(['xdg-mime', 'query', 'default', SCHEME],
                                 capture_output=True, text=True, check=False)
        if current.stdout.strip() == APP:
            print('Note: the custom URI default may remain registered until the desktop MIME cache is updated.')
        HANDLER.unlink(missing_ok=True)
        DESKTOP.unlink(missing_ok=True)
        print('User-owned helper files removed. No privileged files were installed.')
        return
    for exe in ('pkexec', 'xdg-mime', 'systemctl'):
        if shutil.which(exe) is None:
            sys.exit(f'Missing requirement: {exe}')
    if not Path('/usr/bin/pkexec').is_file() or not Path('/usr/bin/systemctl').is_file():
        sys.exit('This helper expects standard systemd/Polkit binary paths; not supported here.')
    if HANDLER.is_symlink() or DESKTOP.is_symlink():
        sys.exit('Refusing to overwrite symlinked helper paths.')
    HANDLER.parent.mkdir(parents=True, exist_ok=True)
    DESKTOP.parent.mkdir(parents=True, exist_ok=True)
    # The Desktop entry launches an unprivileged handler, never pkexec directly.
    HANDLER.write_text(HANDLER_SOURCE)
    HANDLER.chmod(0o755)
    DESKTOP.write_text('[Desktop Entry]\nType=Application\nName=Virtuoso XT Service Controls\n'
                       'Comment=Polkit-protected OpenLinkHub service actions\n'
                       f'Exec={HANDLER} %u\nIcon=audio-headset\nTerminal=false\n'
                       'NoDisplay=true\nMimeType=x-scheme-handler/virtuosoxt-service;\nCategories=Utility;\n')
    result = subprocess.run(['xdg-mime', 'default', APP, SCHEME], check=False)
    if result.returncode:
        sys.exit('Could not register custom URI handler (files have been installed).')
    print('Installed optional handler. Service actions will request administrator authentication.')
    print('No system service was changed. No administrator rule was added.')

if __name__ == '__main__':
    main()
