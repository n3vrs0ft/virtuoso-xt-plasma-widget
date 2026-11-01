#!/usr/bin/env python3
"""Mock-only service URI-handler checks. Never runs pkexec or systemctl."""
from pathlib import Path
from ast import parse, Assign, Name, Constant
from types import SimpleNamespace
from unittest.mock import patch
import sys

source = (Path(__file__).resolve().parents[1] / 'tools/install-service-helper.py').read_text()
tree = parse(source)
handler = next(node.value.value for node in tree.body
               if isinstance(node, Assign) and any(isinstance(t, Name) and t.id == 'HANDLER_SOURCE'
               for t in node.targets) and isinstance(node.value, Constant))
module = {'__name__': 'vxt_unit_test'}
exec(compile(handler, '<embedded-handler>', 'exec'), module)
expected = {
    'start': ['/usr/bin/pkexec', '/usr/bin/systemctl', 'start', 'openlinkhub.service'],
    'restart': ['/usr/bin/pkexec', '/usr/bin/systemctl', 'restart', 'openlinkhub.service'],
    'enable': ['/usr/bin/pkexec', '/usr/bin/systemctl', 'enable', '--now', 'openlinkhub.service'],
}
for op, cmd in expected.items():
    with patch('subprocess.run', return_value=SimpleNamespace(returncode=0)) as run:
        with patch.object(sys, 'argv', ['handler', f'virtuosoxt-service://{op}']):
            assert module['main']() == 0
        assert run.call_args.args[0] == cmd
    print('PASS: authorized fixed operation ' + op)
invalid = [
    'virtuosoxt-service://disable', 'virtuosoxt-service://start/extra',
    'virtuosoxt-service://start?unit=ssh.service',
    'virtuosoxt-service://restart#other',
    'virtuosoxt-service://start:1234',
    'virtuosoxt-service://start@other',
    'https://start', 'virtuosoxt-service:enable',
]
for uri in invalid:
    with patch('subprocess.run') as run:
        with patch.object(sys, 'argv', ['handler', uri]):
            assert module['main']() == 2, uri
        run.assert_not_called()
    print('PASS: rejects invalid service URI ' + uri)
print('All helper URI tests passed (no service operations executed).')
