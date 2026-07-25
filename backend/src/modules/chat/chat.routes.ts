import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { getUserConversations, getConversationHistory, verifyConversationOwner, deleteConversation, renameConversation } from './chat.service';
import type { AuthenticatedRequest } from '../../shared/types';

const router = Router();
router.use(requireAuth as (req: Request, res: Response, next: NextFunction) => void);

router.get('/conversations', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const convs = await getUserConversations(authReq.user.id);
    res.json(convs);
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const isOwner = await verifyConversationOwner(id, authReq.user.id);
    if (!isOwner) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }
    const msgs = await getConversationHistory(id);
    res.json(msgs);
  } catch (err) {
    next(err);
  }
});

router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const deleted = await deleteConversation(id, authReq.user.id);
    if (!deleted) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch('/conversations/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const { title } = req.body as { title?: string };
    if (!title) {
      res.status(400).json({ message: 'title is required' });
      return;
    }
    const renamed = await renameConversation(id, authReq.user.id, title);
    if (!renamed) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as chatRouter };
