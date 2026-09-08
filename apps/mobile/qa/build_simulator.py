#!/usr/bin/env python3
"""Create a separate simulator-only app from an existing local native build."""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--base-app', required=True, type=Path, help='Existing Release-iphonesimulator/Litterbugs.app')
parser.add_argument('--device', help='Optional booted simulator UDID to install and launch')
args = parser.parse_args()
base = args.base_app.resolve()
with (base / 'Info.plist').open('rb') as file:
    info = plistlib.load(file)
if 'iPhoneSimulator' not in info.get('CFBundleSupportedPlatforms', []):
    raise SystemExit('Only simulator builds are accepted; device/distribution builds are rejected.')
if b'propConfig_annotationZIndex' not in (base / info['CFBundleExecutable']).read_bytes():
    raise SystemExit('Rebuild the simulator app from this checkout first: its native marker-layering patch is missing.')
output = Path(tempfile.mkdtemp(prefix='litterbugs-fixtures-'))
app = output / 'LitterbugsFixtures.app'
shutil.copytree(base, app)
info['CFBundleIdentifier'] = 'com.gegibson.litterbugs.fixtures'
info['CFBundleDisplayName'] = 'LB Fixtures'
info['CFBundleName'] = 'Litterbugs Fixtures'
info.pop('CFBundleURLTypes', None)
with (app / 'Info.plist').open('wb') as file:
    plistlib.dump(info, file)
shutil.rmtree(app / '_CodeSignature', ignore_errors=True)
mobile = Path(__file__).resolve().parents[1]
env = {key: value for key, value in os.environ.items() if not key.startswith('EXPO_PUBLIC_')}
env.update({'EXPO_NO_DOTENV': '1', 'CI': '1'})
subprocess.run(['npx', '--no-install', 'expo', 'export:embed', '--entry-file', str(mobile / 'qa/index.js'), '--platform', 'ios', '--dev', 'false', '--bytecode', '--bundle-output', str(app / 'main.jsbundle'), '--assets-dest', str(app)], cwd=mobile, env=env, check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(app)], check=True)
subprocess.run(['codesign', '--verify', '--deep', str(app)], check=True)
if args.device:
    subprocess.run(['xcrun', 'simctl', 'install', args.device, str(app)], check=True)
    subprocess.run(['xcrun', 'simctl', 'launch', args.device, info['CFBundleIdentifier']], check=True)
print(f'Fixture app: {app}')
