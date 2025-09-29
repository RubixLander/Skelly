import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('PG_CONNECTION') private readonly pool: Pool,
    private readonly authService: AuthService,
  ) {}

async createUser(createUserDto: CreateUserDto): Promise<void> {
  const {
    nickname,
    display_email,
    custom_profile_image_url,
    bio,
    password,
  } = createUserDto;

  // Validar campos obligatorios (esto debería hacerlo automáticamente con class-validator, pero puedes verificar aquí también si quieres)
  if (!nickname || !display_email || !password) {
    throw new Error('Nombre, correo y contraseña son obligatorios');
  }

  // Verificar si ya existe el email
  const checkQuery = 'SELECT 1 FROM users WHERE display_email = $1';
  const checkResult = await this.pool.query(checkQuery, [display_email]);
  
  if ((checkResult.rowCount ?? 0) > 0) {
    throw new ConflictException('El correo electrónico ya está registrado');
  }


  // Hashear la contraseña
  const hashedPassword = await this.authService.hashPassword(password);

  const query = `
    INSERT INTO users (nickname, display_email, custom_profile_image_url, bio, password)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await this.pool.query(query, [
    nickname,
    display_email,
    custom_profile_image_url || null,
    bio || null,
    hashedPassword,
  ]);
}

  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<void> {
    const { nickname, custom_profile_image_url, bio } = updateUserDto;

    // Verificar que el usuario existe
    const checkUser = await this.pool.query(
      'SELECT 1 FROM users WHERE user_id = $1',
      [userId],
    );

    if ((checkUser.rowCount ?? 0) === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Ejecutar la actualización
    const query = `
      UPDATE users
      SET nickname = COALESCE($1, nickname),
          custom_profile_image_url = COALESCE($2, custom_profile_image_url),
          bio = COALESCE($3, bio)
      WHERE user_id = $4
    `;

    await this.pool.query(query, [
      nickname ?? null,
      custom_profile_image_url ?? null,
      bio ?? null,
      userId,
    ]);
  }
}