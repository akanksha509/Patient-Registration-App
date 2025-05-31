// src/db/migrations.js
export async function runMigrations(db) {
  // 1) schema_version bootstrap -----------------------------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id      INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT INTO schema_version (id, version)
      VALUES (1, 1)
      ON CONFLICT (id) DO NOTHING;
  `);

  // 2) read current version ---------------------------------------------
  const res     = await db.query(`SELECT version FROM schema_version WHERE id = 1;`);
  const version = res.rows[0]?.version || 1;

  // 3) v1 – create patients table + trigger + indexes -------------------
  await db.exec(`
    -- Create patients table (with TIMESTAMP columns; v1)
    CREATE TABLE IF NOT EXISTS patients (
      id                      SERIAL PRIMARY KEY,
      first_name              VARCHAR(100) NOT NULL,
      last_name               VARCHAR(100) NOT NULL,
      email                   VARCHAR(255) UNIQUE NOT NULL,
      phone                   VARCHAR(20),
      date_of_birth           DATE NOT NULL,
      gender                  VARCHAR(10) CHECK (gender IN ('male','female','other')),
      address                 TEXT,
      emergency_contact_name  VARCHAR(200),
      emergency_contact_phone VARCHAR(20),
      medical_history         TEXT,
      allergies               TEXT,
      created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Trigger keeps updated_at in sync
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
    CREATE TRIGGER update_patients_updated_at
      BEFORE UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();

    /* ── Indexes (v1) ─────────────────────────────────────────────── */
    CREATE INDEX IF NOT EXISTS idx_patients_email  ON patients(email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);  -- NEW
    CREATE INDEX IF NOT EXISTS idx_patients_name   ON patients(last_name, first_name);
  `);

  // 4) v2 – convert timestamps to IST-backed TIMESTAMPTZ ----------------
  if (version < 2) {
    await db.exec(`
      -- Alter created_at & updated_at to TIMESTAMPTZ in IST (v2)
      ALTER TABLE patients
        ALTER COLUMN created_at TYPE TIMESTAMPTZ
          USING created_at AT TIME ZONE 'Asia/Kolkata',
        ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ
          USING updated_at AT TIME ZONE 'Asia/Kolkata',
        ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Asia/Kolkata');

      -- Replace trigger to use IST
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now() AT TIME ZONE 'Asia/Kolkata';
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
      CREATE TRIGGER update_patients_updated_at
        BEFORE UPDATE ON patients
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();

      -- bump schema version to 2
      UPDATE schema_version SET version = 2 WHERE id = 1;
    `);
  }
}



