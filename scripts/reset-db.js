import { pool } from '../src/config/db.js';
import { runInitDb } from './init-db.js';
import { runSeedDb } from './seed.js';
import { fileURLToPath } from 'url';

export async function resetDb() {
  console.log('Resetting PostgreSQL database...');
  const client = await pool.connect();
  try {
    await client.query(`
      DROP TABLE IF EXISTS swap_trail_nodes CASCADE;
      DROP TABLE IF EXISTS shift_swap_transactions CASCADE;
      DROP TABLE IF EXISTS shifts CASCADE;
      DROP TABLE IF EXISTS customer_services CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS shift_swap_logs CASCADE;
      DROP TABLE IF EXISTS shift_todos CASCADE;
      DROP TABLE IF EXISTS service_todos CASCADE;
      DROP TABLE IF EXISTS appointments CASCADE;
    `);
    console.log('Dropped all existing tables.');
  } finally {
    client.release();
  }

  await runInitDb();
  await runSeedDb();
  console.log('✅ Database reset and seeded successfully!');
}

// Run directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
