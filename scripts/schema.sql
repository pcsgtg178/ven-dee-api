-- ============================================================================
-- VenDee (เวรดี) - PostgreSQL Database Schema (Pure PostgreSQL DDL)
-- No Prisma ORM - Standard PostgreSQL with pgcrypto for UUID generation
-- ============================================================================

-- 1. Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Table: shifts (ตารางเวรโรงพยาบาล)
-- ============================================================================
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

-- Indexes for shifts
CREATE INDEX IF NOT EXISTS idx_shifts_date_status ON shifts(shift_date, status);
CREATE INDEX IF NOT EXISTS idx_shifts_category ON shifts(category);
CREATE INDEX IF NOT EXISTS idx_shifts_parent ON shifts(parent_shift_id);
CREATE INDEX IF NOT EXISTS idx_shifts_type ON shifts(shift_type);

-- ============================================================================
-- 3. Table: shift_swap_transactions (ประวัติธุรกรรมการแลกเวร)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_swap_tx_old_shift ON shift_swap_transactions(old_shift_id);
CREATE INDEX IF NOT EXISTS idx_swap_tx_new_shift ON shift_swap_transactions(new_shift_id);

-- ============================================================================
-- 4. Table: swap_trail_nodes (เส้นทางการส่งต่อเวร Multi-hop Swap Trail)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_swap_trail_shift ON swap_trail_nodes(shift_id);
CREATE INDEX IF NOT EXISTS idx_swap_trail_tx ON swap_trail_nodes(transaction_id);

-- ============================================================================
-- 5. Table: customers (ข้อมูลลูกค้า/ผู้ป่วยรับบริการหัตถการ)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================================================
-- 6. Table: customer_services (นัดหมายและประวัติงานบริการลูกค้า)
-- ============================================================================
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

-- ============================================================================
-- 7. Legacy Compatibility Tables (Support for existing MVC models)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) DEFAULT 'shift',
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night', 'r1', 'r2')),
    date DATE NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'black' CHECK (category IN ('black', 'red', 'green')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'swapped_out', 'cancelled')),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    department VARCHAR(255),
    note TEXT,
    parent_shift_id UUID REFERENCES shift_todos(id) ON DELETE SET NULL,
    swapped_with VARCHAR(255),
    original_owner VARCHAR(255),
    swap_date DATE,
    swap_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_shift_todos_parent ON shift_todos(parent_shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_todos_date_cat ON shift_todos(date, category, status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_logs_source ON shift_swap_logs(source_shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_logs_target ON shift_swap_logs(target_shift_id);
