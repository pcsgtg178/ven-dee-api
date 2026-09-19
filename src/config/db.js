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
          user_id UUID,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          note TEXT,
          address TEXT,
          avatar_color VARCHAR(50) DEFAULT 'bg-emerald-500',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT 'bg-emerald-500';
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

        CREATE TABLE IF NOT EXISTS shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          shift_date DATE NOT NULL,
          shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night', 'r1', 'r2')),
          category VARCHAR(20) NOT NULL DEFAULT 'black' CHECK (category IN ('black', 'red', 'green')),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'swapped_out', 'cancelled')),
          department VARCHAR(255),
          note TEXT,
          parent_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
          swapped_with VARCHAR(255),
          original_owner VARCHAR(255),
          swap_date DATE,
          swap_reason TEXT,
          is_locked BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_shifts_date_status ON shifts(shift_date, status);
        CREATE INDEX IF NOT EXISTS idx_shifts_category ON shifts(category);
        CREATE INDEX IF NOT EXISTS idx_shifts_parent ON shifts(parent_shift_id);

        CREATE TABLE IF NOT EXISTS shift_swap_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          old_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
          new_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
          partner_name VARCHAR(255) NOT NULL,
          original_owner VARCHAR(255),
          swap_date DATE NOT NULL,
          reason TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'rolled_back')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS swap_trail_nodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
          transaction_id UUID REFERENCES shift_swap_transactions(id) ON DELETE CASCADE,
          step_order INT NOT NULL,
          from_person VARCHAR(255) NOT NULL,
          to_person VARCHAR(255) NOT NULL,
          node_date DATE NOT NULL,
          shift_label VARCHAR(100) NOT NULL,
          note TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customer_services (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
          service_date DATE NOT NULL,
          service_time TIME NOT NULL,
          service_types JSONB NOT NULL DEFAULT '[]',
          other_service_text VARCHAR(255),
          medications JSONB DEFAULT '[]',
          note TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
          price NUMERIC(10, 2) DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_customer_services_datetime ON customer_services(service_date, service_time, status);
        CREATE INDEX IF NOT EXISTS idx_customer_services_customer ON customer_services(customer_id);

        -- Compatibility tables for existing models
        CREATE TABLE IF NOT EXISTS shift_todos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) DEFAULT 'shift',
          shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night', 'r1', 'r2')),
          date DATE NOT NULL,
          category VARCHAR(20) NOT NULL DEFAULT 'black' CHECK (category IN ('black', 'red', 'green')),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'swapped_out', 'cancelled')),
          is_locked BOOLEAN NOT NULL DEFAULT FALSE,
          parent_shift_id UUID REFERENCES shift_todos(id) ON DELETE SET NULL,
          swapped_with VARCHAR(255),
          original_owner VARCHAR(255),
          swap_note TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- Safe migrations for existing shift_todos tables
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'black';
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS parent_shift_id UUID REFERENCES shift_todos(id) ON DELETE SET NULL;
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS swapped_with VARCHAR(255);
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS original_owner VARCHAR(255);
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS swap_note TEXT;
        ALTER TABLE shift_todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

        CREATE TABLE IF NOT EXISTS shift_swap_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          action VARCHAR(50) NOT NULL CHECK (action IN ('swap', 'cancel_swap')),
          source_shift_id UUID REFERENCES shift_todos(id) ON DELETE SET NULL,
          target_shift_id UUID REFERENCES shift_todos(id) ON DELETE SET NULL,
          swapped_with VARCHAR(255),
          original_owner VARCHAR(255),
          note TEXT,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_shift_todos_parent ON shift_todos(parent_shift_id);
        CREATE INDEX IF NOT EXISTS idx_shift_todos_date_cat ON shift_todos(date, category, status);
        CREATE INDEX IF NOT EXISTS idx_shift_swap_logs_source ON shift_swap_logs(source_shift_id);
        CREATE INDEX IF NOT EXISTS idx_shift_swap_logs_target ON shift_swap_logs(target_shift_id);

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
      console.log('PostgreSQL database tables initialized successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection / initialization error:', error.message);
  }
};
