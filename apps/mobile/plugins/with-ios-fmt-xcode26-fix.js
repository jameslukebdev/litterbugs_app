const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const POST_INSTALL = '  post_install do |installer|';
const PATCH_MARKER = '# Litterbugs: Xcode 26 Apple Clang compatibility for fmt 11.0.2';

module.exports = function withIosFmtXcode26Fix(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'Podfile'
      );
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(PATCH_MARKER)) {
        return modConfig;
      }

      if (!podfile.includes(POST_INSTALL)) {
        throw new Error('Unable to add the Xcode 26 fmt compatibility patch.');
      }

      const rubyPatch = `${POST_INSTALL}
    ${PATCH_MARKER}
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      fmt_source = File.read(fmt_base)
      fmt_patched = fmt_source.gsub(
        '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L',
        '#elif defined(__apple_build_version__)'
      )
      if fmt_patched != fmt_source
        File.chmod(0644, fmt_base)
        File.write(fmt_base, fmt_patched)
      end
    end`;

      fs.writeFileSync(
        podfilePath,
        podfile.replace(POST_INSTALL, rubyPatch)
      );
      return modConfig;
    },
  ]);
};
