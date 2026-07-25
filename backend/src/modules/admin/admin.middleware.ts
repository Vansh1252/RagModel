import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types';
import { ForbiddenError } from '../../shared/utils/errors';

export function requireAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
}
