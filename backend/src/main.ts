import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigError, getConfig } from './common/config/config.service';

async function bootstrap(): Promise<void> {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.enableCors({
    origin: config.allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.enableShutdownHooks();

  await app.listen(config.port);

  console.log(
    `School Management SaaS backend listening on port ${config.port} (${config.env})`,
  );
}

bootstrap().catch((error) => {
  if (error instanceof ConfigError) {
    console.error(`\n${error.message}\n`);
  } else {
    console.error('\nFatal error during startup:\n', error, '\n');
  }

  process.exitCode = 1;
});