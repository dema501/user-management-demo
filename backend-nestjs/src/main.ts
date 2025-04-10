import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

// Use dynamic import for package.json in ESM
const {
  default: { version, description },
} = await import('../package.json', { assert: { type: 'json' } });

async function bootstrap() {
  const appLogger = new Logger('Bootstrap', {
    timestamp: true,
  });

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: true, // Allow all origins (adjust for production)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // Swagger Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle(description)
    .setDescription('API for managing users, using Zod for validation.')
    .setVersion(version)
    .addServer(`http://localhost:${port}`, 'Local Development')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerPath = `${apiPrefix}/docs`;
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  await app.listen(port);

  appLogger.log(
    `🚀 Application is running on: http://localhost:${port}${apiPrefix}`,
    `🌱 Environment: ${nodeEnv}`,
    `📚 Swagger Docs available at: http://localhost:${port}${swaggerPath}`,
  );
}
bootstrap().catch((err) => {
  console.error('💥 Failed to bootstrap application:', err);
  if (err instanceof ZodError) {
    // Log Zod errors during bootstrap (e.g., env var validation)
    console.error('❌ Zod Validation Error during bootstrap:', err.format());
  }
  process.exit(1);
});
