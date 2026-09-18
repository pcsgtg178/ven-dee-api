import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'vendee_db',
      }
);

export const initDb = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          note TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS shift_todos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) DEFAULT 'shift',
          shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
          date DATE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS service_todos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          all_day BOOLEAN DEFAULT FALSE,
          background_color VARCHAR(50),
          border_color VARCHAR(50),
          customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
          services TEXT[] NOT NULL DEFAULT '{}',
          medicines TEXT[] DEFAULT '{}',
          note TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          appointment_date TIMESTAMPTZ NOT NULL,
          services TEXT[] NOT NULL DEFAULT '{}',
          medicines TEXT[] DEFAULT '{}',
          note TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Database tables initialized successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection / initialization error:', error.message);
  }
};
