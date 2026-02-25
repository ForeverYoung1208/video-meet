#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
import { execSync } from 'child_process';

function getTargetEnv(argv: string[]): string | undefined {
  const args = argv.slice(2);
  return args[0];
}

const targetEnv = getTargetEnv(process.argv);

if (!targetEnv) {
  console.error('Usage: npm run detach-volume -- <target environment>');
  console.error('Example: npm run detach-volume -- dev');
  process.exit(1);
}

let config;
try {
  config = require(`../config.${targetEnv}.ts`).config;
} catch (error: any) {
  console.error(`Failed to load config.${targetEnv}.ts`, error);
  process.exit(1);
}

const { dbVolumeId, region } = config;

if (!dbVolumeId) {
  console.log('✅ No volume to detach (dbVolumeId not set)');
  process.exit(0);
}

console.log(`Checking volume ${dbVolumeId} in ${region}...`);

try {
  const volumeState = execSync(
    `aws ec2 describe-volumes --volume-ids ${dbVolumeId} --region ${region} --query "Volumes[0].State" --output text`,
    { encoding: 'utf-8' },
  ).trim();

  if (volumeState === 'in-use') {
    console.log('Volume is attached. Detaching...');
    execSync(
      `aws ec2 detach-volume --volume-id ${dbVolumeId} --region ${region}`,
      {
        stdio: 'inherit',
      },
    );

    console.log('Waiting for volume to become available...');
    execSync(
      `aws ec2 wait volume-available --volume-ids ${dbVolumeId} --region ${region}`,
      { stdio: 'inherit' },
    );

    console.log('✅ Volume detached successfully');
  } else if (volumeState === 'available') {
    console.log('✅ Volume is already available');
  } else {
    console.log(`⚠️  Volume state: ${volumeState}`);
  }
} catch (error: any) {
  console.error('Failed to detach volume:', error.message);
  process.exit(1);
}
