// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
// 🚨 CAMBIO CLAVE 1: Importar NestExpressApplication para usar useStaticAssets
import { NestExpressApplication } from '@nestjs/platform-express'; 
import * as path from 'path'; // 🚨 Necesario para rutas de archivos

config(); // Cargar variables de entorno

// 🚨 CAMBIO CLAVE 2: Usar NestFactory.create<NestExpressApplication>
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());

  // 🛑 ELIMINAMOS bodyParser.json/urlencoded. Ya no guardamos Base64, así que no es necesario 
  // aumentar el límite del body, y puede interferir con Multer.
  
  // 🚨 CONFIGURACIÓN 1: Servir archivos estáticos de USUARIOS (/uploads/)
  // Esto mapea la URL /uploads/ a la carpeta física /public/uploads
  app.useStaticAssets(path.join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads/',
  });

  // 🔑 CONFIGURACIÓN FALTANTE: Servir archivos estáticos de COMUNIDADES (/group_uploads/) 🔑
  app.useStaticAssets(path.join(__dirname, '..', 'public', 'group_uploads'), {
    prefix: '/group_uploads/',
  });
  // ----------------------------------------------------------------------------------------

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