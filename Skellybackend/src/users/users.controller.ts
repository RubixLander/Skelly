// src/users/users.controller.ts
import { Controller, Post, Body, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

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

      // Si no es instancia de Error, lanza mensaje genérico
      throw new BadRequestException('Datos inválidos');
    }
}
}
