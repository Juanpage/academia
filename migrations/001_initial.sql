-- ============================================================
-- Academia Militar Digital — Migración inicial
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Aspirantes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aspirants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cedula          VARCHAR(10) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    birth_date      DATE,
    gender          VARCHAR(10) CHECK (gender IN ('M', 'F')),
    status          VARCHAR(30) DEFAULT 'registered'
                    CHECK (status IN ('registered','active','inactive','graduated','expelled')),
    moodle_user_id  INTEGER,
    moodle_username VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Usuarios del sistema (staff, admin) ─────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'staff'
                    CHECK (role IN ('admin','staff','instructor','medic')),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Evaluaciones académicas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id     UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    course_id       INTEGER,           -- id de Moodle
    course_name     VARCHAR(255),
    grade           NUMERIC(5,2) CHECK (grade BETWEEN 0 AND 100),
    grade_letter    VARCHAR(5),
    recorded_at     TIMESTAMPTZ DEFAULT NOW(),
    synced_at       TIMESTAMPTZ,       -- última sincronización con Moodle
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Evaluaciones físicas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS physical_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id     UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    test_type       VARCHAR(50) NOT NULL,  -- 'run_1000m','pushups','situps','pullups'
    raw_value       NUMERIC(8,2) NOT NULL, -- tiempo en seg, repeticiones, etc.
    score           NUMERIC(5,2),          -- puntaje según baremo FFAA
    evaluated_by    UUID REFERENCES users(id),
    evaluated_at    TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Evaluaciones psicológicas ───────────────────────────────
CREATE TABLE IF NOT EXISTS psychological_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id     UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    test_name       VARCHAR(100) NOT NULL,
    score           NUMERIC(5,2),
    result          VARCHAR(50),   -- 'APTO','NO_APTO','CONDICIONAL'
    evaluated_by    UUID REFERENCES users(id),
    evaluated_at    TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Evaluaciones médicas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id     UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    height_cm       NUMERIC(5,1),
    weight_kg       NUMERIC(5,1),
    bmi             NUMERIC(5,2),
    blood_type      VARCHAR(5),
    result          VARCHAR(50),   -- 'APTO','NO_APTO','OBSERVADO'
    evaluated_by    UUID REFERENCES users(id),
    evaluated_at    TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Puntaje global (columna generada) ───────────────────────
CREATE TABLE IF NOT EXISTS global_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id     UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    academic_score  NUMERIC(5,2) DEFAULT 0,   -- 40%
    physical_score  NUMERIC(5,2) DEFAULT 0,   -- 35%
    psych_score     NUMERIC(5,2) DEFAULT 0,   -- 15%
    medical_score   NUMERIC(5,2) DEFAULT 0,   -- 10%
    total_score     NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(
            (academic_score * 0.40) +
            (physical_score * 0.35) +
            (psych_score    * 0.15) +
            (medical_score  * 0.10),
        2)
    ) STORED,
    rank_position   INTEGER,
    calculated_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Finanzas / Pagos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirant_id         UUID NOT NULL REFERENCES aspirants(id) ON DELETE CASCADE,
    concept             VARCHAR(255) NOT NULL,
    amount              NUMERIC(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'USD',
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','overdue','cancelled')),
    due_date            DATE,
    paid_at             TIMESTAMPTZ,
    payment_method      VARCHAR(50),
    -- SRI Ecuador
    comprobante_number  VARCHAR(20),  -- formato 001-001-XXXXXXXXX
    comprobante_data    JSONB,        -- preparado para facturación electrónica XML
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Logs de sincronización Moodle ───────────────────────────
CREATE TABLE IF NOT EXISTS moodle_sync_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation   VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(100),
    status      VARCHAR(20) CHECK (status IN ('success','error','partial')),
    details     JSONB,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aspirants_cedula   ON aspirants(cedula);
CREATE INDEX IF NOT EXISTS idx_aspirants_status   ON aspirants(status);
CREATE INDEX IF NOT EXISTS idx_aspirants_moodle   ON aspirants(moodle_user_id);
CREATE INDEX IF NOT EXISTS idx_academic_aspirant  ON academic_records(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_physical_aspirant  ON physical_records(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_psych_aspirant     ON psychological_records(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_medical_aspirant   ON medical_records(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_global_scores      ON global_scores(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_payments_aspirant  ON payments(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments(status);

-- ─── Usuario admin por defecto ────────────────────────────────
INSERT INTO users (username, email, password_hash, role, first_name, last_name)
VALUES (
    'admin',
    'admin@academia.local',
    -- bcrypt de 'Admin1234!' — cambiar en producción
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewD.hnXIKoA1hL3.',
    'admin',
    'Administrador',
    'Sistema'
) ON CONFLICT (username) DO NOTHING;
