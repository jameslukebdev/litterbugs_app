import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const mobileDirectory = fileURLToPath(new URL('../apps/mobile/', import.meta.url));
const profiles = JSON.parse(readFileSync(new URL('../apps/mobile/eas.json', import.meta.url))).build;
const targetProfiles = { 'production-preview': 'production-internal', production: 'production' };

export function mobileUpdatePlan(target, args, environment = process.env) {
  const profileName = targetProfiles[target];
  if (!profileName) throw new Error('Choose production-preview or production.');
  const profile = profiles[profileName];
  const options = { platform: 'all' };
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--dry-run') { dryRun = true; continue; }
    const option = { '--message': 'message', '--platform': 'platform', '--rollout-percentage': 'rollout' }[args[i]];
    if (!option || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Use --message, --platform, --rollout-percentage, or --dry-run.');
    }
    options[option] = args[++i];
  }
  if (!options.message?.trim()) throw new Error('An update description is required: --message "Describe the fix".');
  if (!['all', 'ios', 'android'].includes(options.platform)) throw new Error('Platform must be all, ios, or android.');
  if (options.rollout && (!/^\d+$/.test(options.rollout) || +options.rollout < 1 || +options.rollout > 100)) {
    throw new Error('Rollout percentage must be an integer from 1 to 100.');
  }
  // Match the build profile, and prevent local QA .env files changing the
  // production bundle. EAS loads shared client values via --environment.
  const env = { ...environment, ...profile.env, EXPO_NO_DOTENV: '1' };
  delete env.EAS_BUILD;
  delete env.EAS_BUILD_PROFILE;
  delete env.EAS_BUILD_PLATFORM;
  const commandArgs = [
    '--yes', 'eas-cli@27.1.0', 'update', '--non-interactive',
    '--channel', profile.channel, '--environment', profile.environment,
    '--platform', options.platform, '--message', options.message,
    ...(options.rollout ? ['--rollout-percentage', options.rollout] : []),
  ];
  return { dryRun, command: 'npx', args: commandArgs, cwd: mobileDirectory, env };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const plan = mobileUpdatePlan(process.argv[2], process.argv.slice(3));
    if (plan.dryRun) {
      // Print the command only; environment variables can contain credentials.
      console.log(JSON.stringify({ command: plan.command, args: plan.args, cwd: plan.cwd }, null, 2));
    } else {
      const result = spawnSync(plan.command, plan.args, { cwd: plan.cwd, env: plan.env, stdio: 'inherit' });
      if (result.error) throw result.error;
      process.exitCode = result.status ?? 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
