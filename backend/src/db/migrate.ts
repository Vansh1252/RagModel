import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const client = await pool.connect();

  try {
    // Track applied migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`[migrate] Applying ${file}…`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] ${file} applied.`);
    }

    console.log('[migrate] All migrations up to date.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('[migrate] Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
