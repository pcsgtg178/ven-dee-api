import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeedDb() {
  const seedPath = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');

  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('Applying seed.sql to PostgreSQL...');
    await client.query(sql);
    console.log('✅ Seed data inserted successfully!');
  } catch (error) {
    console.error('❌ Failed to seed database:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeedDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
