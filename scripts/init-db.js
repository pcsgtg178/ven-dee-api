import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runInitDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('Applying schema.sql to PostgreSQL...');
    await client.query(sql);
    console.log('✅ PostgreSQL Schema initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runInitDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
