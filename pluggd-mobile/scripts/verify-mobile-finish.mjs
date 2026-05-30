import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const scripts = readdirSync(new URL('./', import.meta.url))
  .filter((file) => /^(verify-ios|verify-mobile)-.*\.mjs$/.test(file))
  .filter((file) => file !== 'verify-mobile-finish.mjs')
  .sort();

const commands = [
  ...scripts.map((script) => ['node', [`scripts/${script}`]]),
  ['npx', ['tsc', '--noEmit']],
  ['npx', ['expo-doctor']],
];

for (const [command, args] of commands) {
  console.log(`== ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('mobile finish verification passed');
