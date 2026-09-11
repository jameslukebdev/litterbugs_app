# Inter fonts for generated share images

Inter Regular and Bold are bundled as static TrueType fonts, copied unchanged
from Expo's `expo-dev-menu/android/src/main/res/font` distribution already used
by this project. They provide real 400/700 weights to Next ImageResponse rather
than relying on its regular-only default font. The application reads these local
files at render time; no font-service request or per-image charge is involved.

Upstream: https://github.com/rsms/inter
License: SIL Open Font License 1.1; see Inter-LICENSE.txt and font metadata.
