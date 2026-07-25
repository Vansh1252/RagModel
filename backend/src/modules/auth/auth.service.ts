import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { users, sessions } from '../../db/schema';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../shared/utils/errors';
import { env } from '../../config/env';

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    const isAdmin =
      env.ADMIN_EMAIL !== undefined &&
      dto.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    const [user] = await db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        password: hashed,
        name: dto.name ?? null,
        role: isAdmin ? 'admin' : 'user',
      })
      .returning();

    if (!user) throw new Error('User creation failed');

    return this.issueTokens(user.id, user.email, user.name ?? null, user.role);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (!user) throw new UnauthorizedError('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    return this.issueTokens(user.id, user.email, user.name ?? null, user.role);
  }

  async refresh(token: string): Promise<{ accessToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired, please login again');
    }

    const accessToken = signAccessToken({
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      role: payload.role ?? 'user',
    });

    return { accessToken };
  }

  async logout(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string | null,
    role: 'user' | 'admin' = 'user'
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, name, role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(sessions).values({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
