import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with different settings for dev vs production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: isDevelopment ? true : process.env.ALLOWED_ORIGINS?.split(',') || [],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Bind to 0.0.0.0 to accept connections from any IP
  const port = process.env.PORT ?? 3001;
  const host = isDevelopment ? 'localhost' : '0.0.0.0';
  
  await app.listen(port, host);
  
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Server listening on port: ${port}`);
  
  if (isDevelopment) {
    console.log(`💻 Local development mode - accessible at http://localhost:${port}`);
  }
}
bootstrap();
