import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ENV_LOCAL, ENV_STAGE, ENV_DEV } from './constants/system';
import { initializeTransactionalContext } from 'typeorm-transactional';

async function bootstrap(): Promise<void> {
  Logger.overrideLogger(new Logger('API'));
  initializeTransactionalContext();

  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const currentEnv = configService.get<string>('NODE_ENV');
  const port = configService.get<number>('PORT');
  const corsOrigins = configService.get<string>('SITE_ORIGIN');
  const corsOriginsArray = corsOrigins?.split(',').filter(Boolean) ?? [];

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe(configService.get('validation')));
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
    }),
  );

  app.enableShutdownHooks();
  app.enableCors({ origin: corsOriginsArray });

  // Load swagger, load only for local, staging and dev environments
  if ([ENV_LOCAL, ENV_STAGE, ENV_DEV].includes(currentEnv)) {
    const apiVersion = process.env.npm_package_version;
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tutor Platform API')
      .setDescription(
        `POC API for tutoring platform with video calls and recordings - environment '${currentEnv}' version ${apiVersion}`,
      )
      .setVersion(apiVersion || '1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/doc', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port ?? 3000);

  Logger.verbose(`Application is running on: http://localhost:${port}`);
  Logger.verbose(`Swagger documentation: http://localhost:${port}/api/doc`);
}

void bootstrap();
