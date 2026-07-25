import { db } from '../../config/db';
import { analytics } from '../../db/schema';
import type { NewAnalytics } from '../../db/schema';

export async function logAnalytics(data: Omit<NewAnalytics, 'id' | 'createdAt'>): Promise<void> {
  try {
    await db.insert(analytics).values(data);
  } catch (err) {
    // Analytics logging should never break the main flow
    console.error('[analytics] Failed to log:', err);
  }
}
