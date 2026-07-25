import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../shared/utils/jwt';
import { UnauthorizedError } from '../../shared/utils/errors';
import { AuthenticatedRequest } from '../../shared/types';

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization header'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      role: payload.role ?? 'user',
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}
