import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

config(); // Cargar variables de entorno

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // Aumentar límite del body a 5MB (para imágenes en base64)
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  // Fixed CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
  });
}
bootstrap();
