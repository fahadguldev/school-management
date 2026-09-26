import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
      app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

  const port = process.env.PORT || 4001;
  await app.listen(port);
  console.log(`School Management SaaS backend running on port ${port}`);
}
bootstrap();
