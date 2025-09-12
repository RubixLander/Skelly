// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Pool } from 'pg';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PG_CONNECTION') private readonly pool: Pool
  ) {}

  async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return await argon2.verify(hash, plain);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE display_email = $1';
    const result = await this.pool.query(query, [email]);

    if (result.rowCount === 0) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const user = result.rows[0];

    const passwordMatch = await this.verifyPassword(user.password, password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    delete user.password;

    return user;
  }
}