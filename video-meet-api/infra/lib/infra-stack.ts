/* eslint-disable no-useless-escape */
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { IAppStackConfig } from '../bin/infra';

export class InfraStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    config: IAppStackConfig,
    props?: cdk.StackProps,
  ) {
    super(scope, id, { ...props, crossRegionReferences: true });
    const {
      projectName,
      domainName,
      fullSubDomainNameApp,
      subDomainNameApp,
      userDeploerName,
    } = config;
    /**
     *
     *
     *
     * COMMON
     *
     *
     *
     */

    // Add tag for cost tracking
    cdk.Tags.of(this).add('AppManagerCFNStackKey', this.stackName);

    // Create S3 bucket for code
    const codeBucket = new s3.Bucket(this, `${projectName}CodeBucket`, {
      bucketName: `${projectName}-code-bucket-${this.account}`, // Make it globally unique
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Clean up when stack is deleted
    });
    // Deploy code as part of CDK stack
    new s3deploy.BucketDeployment(this, `${projectName}CodeDeployment`, {
      sources: [
        s3deploy.Source.asset('../', {
          exclude: [
            'node_modules',
            '.git',
            '.env',
            'infra',
            'dist',
            'test',
            'docker/postgres/data',
            'docker/postgres/data_tests',
            'docker/redis/data',
          ],
        }),
      ],
      destinationBucket: codeBucket,
    });

    // Pre-build (random) SSM Parameters values
    const dbPasswordParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const jwtSecretKeyParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const jwtRefreshSecretKeyParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');

    // SSM Parameters
    const dbPasswordParameter = new ssm.StringParameter(
      this,
      `${projectName}DbPasswordParameter`,
      {
        parameterName: `/${projectName}/db-password`,
        stringValue: dbPasswordParameterValue,
        description: 'DB password',
      },
    );
    const jwtSecretKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}JwtSecretKeyParameter`,
      {
        parameterName: `/${projectName}/jwt-secret-key`,
        stringValue: jwtSecretKeyParameterValue,
        description: 'JWT secret key',
      },
    );
    const jwtRefreshSecretKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}JwtRefreshSecretKeyParameter`,
      {
        parameterName: `/${projectName}/jwt-refresh-secret-key`,
        stringValue: jwtRefreshSecretKeyParameterValue,
        description: 'JWT refresh secret key',
      },
    );
    const livekitApiSecretParameter = new ssm.StringParameter(
      this,
      `${projectName}LivekitApiSecretParameter`,
      {
        parameterName: `/${projectName}/livekit-api-secret`,
        stringValue: 'livekit-api-secret',
        description: 'Livekit API secret',
      },
    );
    const awsSecretAccessKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}AwsSecretAccessKeyParameter`,
      {
        parameterName: `/${projectName}/aws-secret-access-key`,
        stringValue: 'aws-secret-access-key',
        description: 'AWS secret access key to access S3 bucket',
      },
    );

    /**
     *
     *
     *
     * NETWORKS
     *
     *
     *
     */

    // VPC
    const vpc = new ec2.Vpc(this, `${projectName}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      availabilityZones: [config.AZ],
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    //Lookup the zone based on domain name
    const zone = route53.HostedZone.fromLookup(this, `${projectName}Zone`, {
      domainName: domainName,
    });

    // Create certificate in us-east-1 for CloudFront
    const certificateStack = new cdk.Stack(
      this,
      `${projectName}CertificateStack`,
      {
        env: {
          account: this.account,
          region: 'us-east-1', // Certificate must be in us-east-1 for CloudFront
        },
      },
    );

    // Create the certificate in the us-east-1 stack
    const certificate = new acm.Certificate(
      certificateStack,
      `${projectName}Certificate`,
      {
        domainName: fullSubDomainNameApp,
        validation: acm.CertificateValidation.fromDns(
          route53.HostedZone.fromLookup(
            certificateStack,
            `${projectName}ZoneForCert`,
            {
              domainName: domainName,
            },
          ),
        ),
      },
    );

    /**
     *
     *
     *
     * SECURITY
     *
     *
     *
     */

    const apiSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}ApiSecurityGroup`,
      {
        vpc,
        description: 'Serurity group for API',
        allowAllOutbound: true,
      },
    );

    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow traffic from any ipv4 to port 3000',
    );

    // TODO delete after debug
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access',
    );

    /**
     *
     *
     *
     * EC2
     *
     *
     *
     */
    // IAM Role for EC2 instance
    const ec2Role = new iam.Role(this, `${projectName}EC2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
      ],
    });

    // Allow EC2 to read SSM parameters
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          dbPasswordParameter.parameterArn,
          jwtSecretKeyParameter.parameterArn,
          jwtRefreshSecretKeyParameter.parameterArn,
          awsSecretAccessKeyParameter.parameterArn,
          livekitApiSecretParameter.parameterArn,
        ],
      }),
    );

    codeBucket.grantRead(ec2Role);

    const userData = ec2.UserData.forLinux();
    const userDataVersion = 'v16'; // bump this whenever you want user data to re-run

    // Create a start script
    const mountEbsScript = `#!/bin/bash
set -ex
echo "Mounting EBS volume for database..."

# Find the attached EBS volume (not the root volume)
DEVICE=/dev/nvme1n1

if ! blkid \$DEVICE; then 
  mkfs -t ext4 \$DEVICE
fi

mkdir -p /mnt/db-data
mount \$DEVICE /mnt/db-data

UUID=\$(blkid -s UUID -o value \$DEVICE)
if ! grep -q "\$UUID" /etc/fstab; then
  echo "UUID=\$UUID /mnt/db-data ext4 defaults,nofail 0 2" >> /etc/fstab
fi

chown -R 999:999 /mnt/db-data
echo "EBS volume mounted successfully"
`;

    const commonScript = `#!/bin/bash
  set -ex
  echo "Starting services and application..."
  cd /var/www/app
  
  # Create .env file with all variables including sensitive ones
cat > .env << EOF
NODE_ENV=${config.targetNodeEnv}
PORT=3000
DEBUG_PORT=9229
SITE_ORIGIN=${config.siteOrigin}

# Database
DB_PORT=5432
DB_USERNAME=${config.databaseUsername}
DB_HOST=db
DB_PASSWORD=\$(aws ssm get-parameter --name "/${projectName}/db-password" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
DB_NAME=${config.databaseName}
TYPEORM_LOGGING=${config.typeormLogging}

# Redis
REDIS_PORT=6379

# JWT
JWT_SECRET_KEY=\$(aws ssm get-parameter --name "/${projectName}/jwt-secret-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
JWT_REFRESH_SECRET_KEY=\$(aws ssm get-parameter --name "/${projectName}/jwt-refresh-secret-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

# Password Hashing
BCRYPT_SALT_ROUNDS=8

# OpenVidu livekit
LIVEKIT_URL=${config.livekitUrl}
LIVEKIT_SECRET=\$(aws ssm get-parameter --name "/${projectName}/livekit-api-secret" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
LIVEKIT_API_KEY=${config.livekitApiKey}

# AWS S3 (for recordings)
AWS_ACCESS_KEY_ID=${config.awsAccessKeyId}
AWS_SECRET_ACCESS_KEY=\$(aws ssm get-parameter --name "/${projectName}/aws-secret-access-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
AWS_REGION=${config.region}
S3_BUCKET_NAME=${config.s3BucketName}
EOF

`;
    const startScript = `
${commonScript}
  docker-compose -f docker-compose-dev.yml up api-build
  docker-compose -f docker-compose-dev.yml up api-run db redis -d
  sleep 5
  docker-compose exec -T api-run npm run migration:run
  rm -f .env
`;

    const restartScript = `
${commonScript}
  docker-compose -f docker-compose-dev.yml run api-build
  docker-compose -f docker-compose-dev.yml restart api-run db redis
  sleep 5
  docker-compose exec -T api-run npm run migration:run
  rm -f .env
`;

    userData.addCommands(
      'set -ex',
      `echo "UserData version: ${userDataVersion}"`,
      'yum update -y',
      'yum install -y docker git unzip',

      // Mount EBS volume BEFORE starting Docker
      'mkdir -p /var/www/app',
      `cat > /var/www/app/mount-ebs.sh << 'EOL'\n${mountEbsScript}\nEOL`,
      'chmod +x /var/www/app/mount-ebs.sh',
      '/var/www/app/mount-ebs.sh',

      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      'chmod 666 /var/run/docker.sock',

      // Install Docker Compose plugin (pinned version)
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      // Also create a symlink for backward compatibility
      'ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose',
      'docker-compose --version',

      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip -q awscliv2.zip',
      './aws/install',
      'chown ec2-user:ec2-user /var/www/app',
      'cd /var/www/app',
      `aws s3 sync s3://${codeBucket.bucketName}/ . --region ${this.region}`,
      'chown -R ec2-user:ec2-user /var/www/app',
      // Make and run the setup script
      `cat > /var/www/app/setup.sh << 'EOL'\n${startScript}\nEOL`,
      `cat > /var/www/app/restart.sh << 'EOL'\n${restartScript}\nEOL`,
      'chmod +x /var/www/app/setup.sh',
      'chmod +x /var/www/app/restart.sh',
      'cd /var/www/app && ./setup.sh',
    );

    const keyPair = new ec2.CfnKeyPair(this, `${projectName}KeyPair`, {
      keyName: `${projectName}-key`,
    });

    const ec2Instance = new ec2.Instance(this, `${projectName}EC2Instance`, {
      vpc,
      securityGroup: apiSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [config.AZ],
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role: ec2Role,
      userData: userData,
      userDataCausesReplacement: true,
      instanceName: `${projectName}-instance-${userDataVersion}`,
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        `${projectName}KeyPairRef`,
        keyPair.keyName,
      ),
    });

    // Tag instance for easy SSM targeting
    cdk.Tags.of(ec2Instance).add('Name', `${projectName}-ec2`);

    // Try to import existing volume from config, otherwise create new
    let dbVolume: ec2.IVolume;

    if (config.dbVolumeId) {
      // dbVolumeId is set in config.ts - Import existing volume (redeployment)
      dbVolume = ec2.Volume.fromVolumeAttributes(
        this,
        `${projectName}DbVolume`,
        {
          volumeId: config.dbVolumeId,
          availabilityZone: ec2Instance.instanceAvailabilityZone,
        },
      );
    } else {
      // dbVolumeId is not set in config.ts - Create new volume (first deployment)
      const newVolume = new ec2.Volume(this, `${projectName}DbVolume`, {
        availabilityZone: ec2Instance.instanceAvailabilityZone,
        size: cdk.Size.gibibytes(1),
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        encrypted: false,
      });
      cdk.Tags.of(newVolume).add('Name', `${projectName}-db-volume`);
      dbVolume = newVolume;

      new cdk.CfnOutput(this, 'DbVolumeId', {
        value: newVolume.volumeId,
        description: `Add this to config.${config.targetNodeEnv}.ts: dbVolumeId: '<this-volume-id>'`,
      });
    }

    // Attach volume to instance
    new ec2.CfnVolumeAttachment(this, `${projectName}DbVolumeAttachment`, {
      instanceId: ec2Instance.instanceId,
      volumeId: dbVolume.volumeId,
      device: '/dev/sdf',
    });

    /**
     *
     *
     *
     * FRONTEND PREPARING AND ROUTE53
     *
     *
     *
     */

    // S3 bucket for frontend
    const frontendBucket = new s3.Bucket(this, `${projectName}FrontendBucket`, {
      bucketName: `${projectName}-frontend-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
    });

    // add cloudfront distribution to handle https
    const distribution = new cloudfront.Distribution(
      this,
      `${projectName}Distribution`,
      {
        defaultBehavior: {
          // Frontend as default behavior
          origin: new origins.S3StaticWebsiteOrigin(frontendBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        additionalBehaviors: {
          '/api/*': {
            // API behavior
            origin: new origins.HttpOrigin(ec2Instance.instancePublicDnsName, {
              httpPort: 3000,
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }),
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
        },

        domainNames: [fullSubDomainNameApp],
        certificate: certificate,
      },
    );

    new route53.ARecord(this, `${projectName}ARecord`, {
      zone: zone,
      recordName: subDomainNameApp,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution),
      ),
    });

    /**
     *
     *
     *
     * USER DEPLOYER
     *
     *
     *
     */

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectName}Deployer`, {
      userName: userDeploerName,
    });

    userDeploer.attachInlinePolicy(
      new iam.Policy(this, `${projectName}DeployerPolicy`, {
        policyName: `publish-to-${projectName}`,
        statements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectName}*`,
            ],
          }),

          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}`,
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}/*`,
            ],
          }),

          // Allow publishing artifacts to the dedicated code bucket
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [codeBucket.bucketArn, `${codeBucket.bucketArn}/*`],
          }),

          // Allow publishing frontend artifacts to the dedicated frontend bucket
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
              frontendBucket.bucketArn,
              `${frontendBucket.bucketArn}/*`,
            ],
          }),

          // Allow triggering SSM RunCommand to restart docker on the instance
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'ssm:SendCommand',
              'ssm:ListCommandInvocations',
              'ssm:ListCommands',
              'ssm:GetCommandInvocation',
            ],
            resources: ['*'],
          }),

          // EC2 permissions for EB environment management
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ec2:Describe*'],
            resources: ['*'],
          }),

          // CloudWatch Logs permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:*'],
            resources: ['*'],
          }),

          // CloudFront permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudfront:CreateInvalidation'],
            resources: ['*'],
          }),
        ],
      }),
    );

    /**
     *
     *
     *
     * OUTPUTS
     *
     *
     *
     */

    // Output the ec2 key pair ID (you'll need to get private key from AWS console)
    new cdk.CfnOutput(this, 'KeyPairId', {
      value: keyPair.getAtt('KeyPairId').toString(),
    });
    new cdk.CfnOutput(this, 'CodeBucketName', {
      value: codeBucket.bucketName,
      description: 'S3 bucket for code deployment',
    });

    // Output the EC2 instance ID
    new cdk.CfnOutput(this, 'EC2 InstanceId', {
      value: ec2Instance.instanceId,
      description: 'EC2 instance ID',
    });

    new cdk.CfnOutput(this, 'UserDeploerName', {
      value: userDeploerName,
      description: 'User deployer name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend deployment',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
