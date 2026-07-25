import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { submitFeedback } from './feedback.service';
import { ValidationError } from '../../shared/utils/errors';
import type { AuthenticatedRequest } from '../../shared/types';

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
});

export async function postFeedback(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    await submitFeedback(parsed.data.messageId, req.user.id, parsed.data.value);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
