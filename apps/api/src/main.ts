import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('Event Planner API')
    .setDescription('Users, events, rooms, sessions, and AI-assisted parsing')
    .setVersion('1.0.0')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc, { jsonDocumentUrl: '/docs-json' });

  const port = process.env.PORT || 3000;
  await app.listen(port as number);
  console.log(`API http://0.0.0.0:${port} — Swagger /docs`);
}
bootstrap();
