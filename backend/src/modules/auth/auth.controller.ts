import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { ValidationError } from '../../shared/utils/errors';
import { env } from '../../config/env';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const { accessToken, refreshToken } = await authService.register(parsed.data);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid email or password format');
    }

    const { accessToken, refreshToken } = await authService.login(parsed.data);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies['refreshToken'] as string | undefined;
    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
      return;
    }

    const { accessToken } = await authService.refresh(token);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies['refreshToken'] as string | undefined;
    if (token) {
      await authService.logout(token);
    }
    res.clearCookie('refreshToken', { path: '/' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
