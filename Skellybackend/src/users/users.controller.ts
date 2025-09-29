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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // <--- usamos memoria, no disco

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(), // <--- usa memoria, no disco
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('Solo se permiten imágenes'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async updateUser(
    @Param('user_id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ message: string }> {
    try {
      if (file) {
        // Convertimos el buffer a base64 para almacenarlo como string (alternativamente, puedes usar buffer directamente con BYTEA)
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        updateUserDto.custom_profile_image_url = base64Image;
      }

      await this.usersService.updateUser(userId, updateUserDto);
      return { message: 'User updated successfully' };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error al actualizar el usuario');
    }
  }
}