// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // Importa AppModule, no SpotifyModule
import { config } from 'dotenv';

config(); // Carga las variables de entorno

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // Usa AppModule aquí

  const port = process.env.PORT || 3001;
  await app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
  });
}
bootstrap();