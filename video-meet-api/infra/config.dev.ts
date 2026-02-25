import { IAppStackConfig } from './bin/infra';

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'tutor-platform';

// define AWS region
const region = 'eu-central-1';
const AZ = 'eu-central-1a';

// define postfix for environment resources to specify
const suffix = '-dev';
const projectName = projectShortName + suffix;

// define aws S3 bucket name
const s3BucketName = projectName + '-recordings';

// define your registered domain (you must have one at Route53)
const domainName = 'for-test.click';

// define your livekit sever URL
const livekitUrl = 'https://for-test.click';

// subdomain for app (will be created, and route .../api will be used to serve api )
const subDomainNameApp = `${projectName}`;
const fullSubDomainNameApp = `${subDomainNameApp}.${domainName}`;

// user for deployment using CI/CD (will be created)
const userDeploerName = `${projectName}-deployer`;

// database name
const databaseName = projectShortName + suffix.replace('-', ''); // DatabaseName must begin with a letter and contain only alphanumeric characters
const databaseUsername = 'postgres';
const dbVolumeId = 'vol-042b7e99a4d8f9ff2'; // Set udefined to create a new volume or set to volume ID to reuse existing volume

const targetNodeEnv = 'development';

// define site origin for cors
const siteOrigin =
  'http://localhost:3000,http://localhost:4200,http://localhost:3001,http://localhost:5173,https://tutor-platform-dev.click';

const awsAccessKeyId = 'your-aws-access-key-id-to-access-s3-bucket';
const livekitApiKey = 'your-livekit-api-key';

const typeormLogging = 'true';

console.info('using development config...');

export const config: IAppStackConfig = {
  databaseName,
  typeormLogging,
  domainName,
  projectName,
  subDomainNameApp,
  fullSubDomainNameApp,
  userDeploerName,
  databaseUsername,
  targetNodeEnv,
  siteOrigin,
  livekitUrl,
  region,
  AZ,
  s3BucketName,
  awsAccessKeyId,
  livekitApiKey,
  dbVolumeId,
};
