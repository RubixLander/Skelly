import {
 Controller,
 Post,
 Body,
 BadRequestException,
 ConflictException,
 Patch,
 Param,
 UploadedFile,
 UseInterceptors,
 InternalServerErrorException, // <-- Añadido
 NotFoundException, // <-- Añadido
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer'; // 🚨 CAMBIO CLAVE: Usar diskStorage
import * as path from 'path'; // <-- Añadido
import * as fs from 'fs'; // <-- Añadido
import { v4 as uuidv4 } from 'uuid'; // <-- Añadido (npm install uuid @types/uuid)

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// --- Definiciones Necesarias ---
// 🚨 INTERFAZ: Necesaria para el tipado de retorno
interface User {
    user_id: string;
    nickname: string;
    display_email: string;
    custom_profile_image_url: string | null;
    bio: string | null;
}

// 🚨 CONFIGURACIÓN DE CARPETA Y DISCO
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadInterceptor = FileInterceptor('image', {
  storage: diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
     const fileExtName = path.extname(file.originalname);
     const randomName = uuidv4();
     cb(null, `${randomName}${fileExtName}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
   if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('Solo se permiten imágenes'), false);
   } else {
    cb(null, true);
   }
  },
});
// --- Fin Definiciones Necesarias ---

@Controller('users')
export class UsersController {
 constructor(private readonly usersService: UsersService) {}

 @Post('register')
 async register(@Body() createUserDto: CreateUserDto): Promise<{ message: string }> {
  try {
   await this.usersService.createUser(createUserDto);
   return { message: 'User registered successfully' };
  } catch (error: unknown) {
   if (error instanceof ConflictException) {
    throw error;
   }
   if (error instanceof Error) {
    throw new BadRequestException(error.message);
   }
   throw new BadRequestException('Datos inválidos');
  }
 }

 @Patch(':user_id')
 @UseInterceptors(uploadInterceptor)
 async updateUser(
  @Param('user_id') userId: string,
  @Body() updateUserDto: UpdateUserDto,
  @UploadedFile() file?: Express.Multer.File,
 ): Promise<User> { // 🚨 CAMBIO CLAVE: Retornamos el objeto User, no solo el mensaje
  const uploadedFilePath = file ? file.path : null;
    let previousUser: User | null = null;
    const isExplicitNullDeletion = updateUserDto.custom_profile_image_url === null;

  try {
   // 1. Verificar usuario existente
   previousUser = await this.usersService.findOne(userId) as User | null; 
   
   if (!previousUser) {
    if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
    throw new NotFoundException('Usuario no encontrado');
   }

if (isExplicitNullDeletion || file) {
    
    // 2. Borrado Físico del Archivo Antiguo (Si existe)
    if (previousUser.custom_profile_image_url && 
        !previousUser.custom_profile_image_url.includes('/profile.png')
    ) {
        try {
            // 🚨 SOLUCIÓN AL ERROR TS2345 🚨
            const urlParts = previousUser.custom_profile_image_url.split('/');
            // Usamos un índice seguro [urlParts.length - 1] para obtener el último elemento
            const oldFileName = urlParts[urlParts.length - 1]; 
            
            // Verificamos que sea un nombre de archivo válido (no vacío)
            if (oldFileName && oldFileName.length > 0) { 
                const oldFilePath = path.join(uploadsDir, oldFileName);
                
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath); // Borra el archivo del disco
                }
            }
        } catch (error) {
            console.error('Error al intentar borrar la imagen antigua:', error);
        }
    }

    if (file) {
        // 3. Subida Nueva Imagen
        const publicUrl = `http://localhost:3001/uploads/${file.filename}`;
        updateUserDto.custom_profile_image_url = publicUrl;
    } 
    // Si es isExplicitNullDeletion, el DTO ya tiene NULL.
}
      
   // 4. Actualizar la base de datos (guarda NULL, URL, o solo texto)
   await this.usersService.updateUser(userId, updateUserDto);
   
   // 5. Devolver el usuario actualizado
   const updatedUser = await this.usersService.findOne(userId);

   return updatedUser as User;

  } catch (error: unknown) {
   // Limpieza del archivo subido en caso de fallo
   if (uploadedFilePath) {
    try { fs.unlinkSync(uploadedFilePath); } 
        catch (e) { console.error('Error al limpiar archivo subido tras un fallo:', e); }
   }
   
   if (error instanceof NotFoundException || error instanceof BadRequestException) { throw error; }
   if (error instanceof Error) { throw new BadRequestException(error.message); }
   throw new InternalServerErrorException('Error al actualizar el usuario');
  }
 }
}