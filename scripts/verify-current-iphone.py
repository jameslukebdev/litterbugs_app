#!/usr/bin/env python3
"""Install the prepared internal iPhone build and save native smoke-test evidence.

Run in the owner's Terminal. Uses the already-open iPhone only, preserves its
app data, and never publishes an OTA or starts a payment. Visual acceptance
checks remain pending until the actual screens are reviewed.
"""
import hashlib
import json
import pathlib
import plistlib
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/mobile-funders-20261124/ios-simulator-current'
APP = OUTPUT / 'unpacked/Litterbugs.app'
DEVICE = '49C7B41E-83FD-42F0-853F-3A4BA7B62C9A'
BUNDLE = 'com.litterbugs.app'


def run(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True,
                          timeout=90).stdout.strip()


def verify_app(app):
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    expo = plistlib.loads((app / 'Expo.plist').read_bytes())
    config = json.loads((app / 'EXConstants.bundle/app.config').read_text())
    if info.get('CFBundleIdentifier') != BUNDLE:
        raise RuntimeError('Unexpected bundle identifier')
    if info.get('CFBundleShortVersionString') != '2.1.1':
        raise RuntimeError('Native version must be 2.1.1')
    if expo.get('EXUpdatesRuntimeVersion') != '2.1.1':
        raise RuntimeError('Expo runtime must be 2.1.1')
    if config.get('extra', {}).get('analytics', {}).get('enabled') is not False:
        raise RuntimeError('Internal test analytics must be disabled')
    return {'nativeVersion': '2.1.1', 'runtime': '2.1.1',
            'build': info.get('CFBundleVersion'), 'analyticsEnabled': False,
            'bundleSHA256': hashlib.sha256((app / 'main.jsbundle').read_bytes()).hexdigest()}


def main():
    expected = verify_app(APP)
    run('codesign', '--verify', '--deep', '--strict', str(APP))
    devices = json.loads(run('xcrun', 'simctl', 'list', 'devices', '--json'))
    match = next((d for group in devices['devices'].values() for d in group
                  if d['udid'] == DEVICE), None)
    if not match or match.get('state') != 'Booted':
        raise RuntimeError('Open the existing iPhone 17 Pro simulator first')
    print('Installing the current internal 2.1.1 build...', flush=True)
    run('xcrun', 'simctl', 'install', DEVICE, str(APP))
    installed = pathlib.Path(run('xcrun', 'simctl', 'get_app_container', DEVICE, BUNDLE, 'app'))
    actual = verify_app(installed)
    if actual != expected:
        raise RuntimeError('Installed app does not match the prepared build')
    launch = run('xcrun', 'simctl', 'launch', '--terminate-running-process', DEVICE, BUNDLE)
    time.sleep(8)
    screenshot = OUTPUT / 'current-iphone-installed.png'
    run('xcrun', 'simctl', 'io', DEVICE, 'screenshot', str(screenshot))
    evidence = {'device': DEVICE, 'installed': actual, 'launch': launch,
                'screenshot': str(screenshot), 'published': False,
                'visualAcceptance': 'PENDING: funders, anonymous checkbox, owner name controls, hearts'}
    (OUTPUT / 'installed-native-verification.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps(evidence, indent=2))
    print('Installation and native/runtime verification complete. Visual checks remain pending.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(str(error))
        if isinstance(error, subprocess.CalledProcessError):
            print(error.stderr)
        raise SystemExit(1)
