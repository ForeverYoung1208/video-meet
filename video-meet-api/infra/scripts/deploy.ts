#!/usr/bin/env node
import { execSync } from 'child_process';

function getTargetEnv(argv: string[]): string | undefined {
  const args = argv.slice(2);

  return args[0];
}

const targetEnv = getTargetEnv(process.argv);

if (!targetEnv) {
  console.error('Usage: npm run deploy -- <target environment>');
  console.error('Example: npm run deploy -- dev');
  process.exit(1);
}

execSync(`npm run detach-volume -- ${targetEnv}`, { stdio: 'inherit' });
execSync(`cdk deploy --all --context targetEnv=${targetEnv}`, {
  stdio: 'inherit',
});
