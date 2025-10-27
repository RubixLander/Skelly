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

  // 🚨 MÉTODO FALTANTE: findOne 🚨
  // Es necesario para que el controlador obtenga la URL de la imagen antigua
  // y el objeto actualizado después de la operación.
 async findOne(userId: string): Promise<any | null> {
   const query = `
    SELECT user_id, nickname, display_email, custom_profile_image_url, bio
    FROM users
    WHERE user_id = $1
   `;
   const result = await this.pool.query(query, [userId]);
   if (result.rowCount === 0) {
     return null;
   }
   return result.rows[0];
 }

 async createUser(createUserDto: CreateUserDto): Promise<void> {
  const {
   nickname,
   display_email,
   custom_profile_image_url,
   bio,
   password,
  } = createUserDto;

  // Validar campos obligatorios
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

 // Construimos dinámicamente la query
 const fields: string[] = [];
 const values: any[] = [];
 let i = 1;

 if (nickname !== undefined) {
  fields.push(`nickname = $${i++}`);
  values.push(nickname);
 }

 if (bio !== undefined) {
  fields.push(`bio = $${i++}`);
  values.push(bio);
 }

 if (custom_profile_image_url !== undefined) {
  fields.push(`custom_profile_image_url = $${i++}`);
  values.push(custom_profile_image_url); // Esto será la URL corta o NULL
 }

 if (fields.length === 0) return; // Nada que actualizar

 const query = `
  UPDATE users
  SET ${fields.join(", ")}
  WHERE user_id = $${i}
 `;

  values.push(userId);

  await this.pool.query(query, values);
}
}