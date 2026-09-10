#!/usr/bin/env python3
"""Check a decoded release manifest against its intended Maps environment.

Pass the manifest decoded from the final APK/AAB, not the prebuild source file.
This catches stale native configuration when switching local QA/release builds.
Never prints the Maps key or other environment values.
"""

import argparse
from pathlib import Path
import shlex
import xml.etree.ElementTree as ET


def verify(manifest, environment, package):
    values = []
    for line in environment.splitlines():
        line = line.strip().removeprefix('export ')
        if line.split('=', 1)[0].strip() != 'GOOGLE_MAPS_ANDROID_API_KEY':
            continue
        parts = shlex.split(line.split('=', 1)[1], comments=True)
        if len(parts) != 1:
            raise ValueError('Expected one non-empty Maps key in the environment file.')
        values.append(parts[0])
    if len(values) != 1:
        raise ValueError('Expected exactly one Maps key in the environment file.')

    root = ET.fromstring(manifest)
    if root.get('package') != package:
        raise ValueError('Packaged Android application ID does not match the intended release.')
    android = '{http://schemas.android.com/apk/res/android}'
    keys = [node.get(android + 'value') for node in root.findall('./application/meta-data')
            if node.get(android + 'name') == 'com.google.android.geo.API_KEY']
    if keys != values:
        raise ValueError('Packaged Maps key does not match the intended environment. Rebuild before distribution.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--env-file', required=True)
    parser.add_argument('--package', required=True)
    args = parser.parse_args()
    try:
        verify(Path(args.manifest).read_text(), Path(args.env_file).read_text(), args.package)
    except (ValueError, OSError, ET.ParseError):
        # Parsing errors can contain source snippets; keep credentials out of logs.
        parser.exit(1, 'Android release Maps check failed: verify the package, decoded manifest and intended environment.\n')
    print('Android release package and Maps key match the intended environment.')
