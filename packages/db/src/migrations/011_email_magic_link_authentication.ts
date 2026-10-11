import { sql, type Kysely } from 'kysely';

export async function up(database: Kysely<unknown>): Promise<void> {
  await sql.raw(EMAIL_MAGIC_LINK_SQL).execute(database);
}

const EMAIL_MAGIC_LINK_SQL = `
-- Email-first SaaS onboarding and sign-in. Raw bearer values are never
-- persisted: only APP_SECRET-keyed digests reach this table.
CREATE TABLE email_auth_transaction (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  purpose text NOT NULL CHECK (purpose IN ('signup', 'signin')),
  token_hash bytea NOT NULL UNIQUE,
  email_normalized text NOT NULL
    CHECK (email_normalized = lower(btrim(email_normalized)) AND position('@' in email_normalized) > 1),
  email_display text NOT NULL CHECK (length(btrim(email_display)) > 3),
  tenant_id uuid REFERENCES tenant(id),
  account_id uuid,
  tenant_name text,
  tenant_slug text,
  school_name text,
  school_slug text,
  school_time_zone text,
  admin_given_name text,
  admin_family_name text,
  admin_display_name text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR revoked_at IS NULL),
  CHECK (
    (purpose = 'signin'
      AND tenant_id IS NOT NULL AND account_id IS NOT NULL
      AND tenant_name IS NULL AND tenant_slug IS NULL
      AND school_name IS NULL AND school_slug IS NULL AND school_time_zone IS NULL
      AND admin_given_name IS NULL AND admin_family_name IS NULL AND admin_display_name IS NULL)
    OR
    (purpose = 'signup'
      AND tenant_id IS NULL AND account_id IS NULL
      AND tenant_name IS NOT NULL AND tenant_slug IS NOT NULL
      AND school_name IS NOT NULL AND school_slug IS NOT NULL AND school_time_zone IS NOT NULL
      AND admin_given_name IS NOT NULL AND admin_family_name IS NOT NULL AND admin_display_name IS NOT NULL)
  ),
  FOREIGN KEY (tenant_id, account_id) REFERENCES account(tenant_id, id)
);

CREATE INDEX email_auth_transaction_expiry_idx
  ON email_auth_transaction (expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

-- Email identities reuse the canonical auth_identity table. A founding
-- administrator email belongs to one tenant in the initial SaaS model;
-- districts that manage several schools should place them in one tenant.
CREATE UNIQUE INDEX auth_identity_magic_email_unique
  ON auth_identity (provider_subject)
  WHERE issuer = 'urn:waypass:magic-link';

-- Magic-link sessions are normal sessions, not temporary setup or recovery.
DO $$
DECLARE
  stale record;
BEGIN
  FOR stale IN
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid = 'auth_session'::regclass
      AND pg_get_constraintdef(oid) LIKE '%authentication_method%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', stale.table_name, stale.conname);
  END LOOP;
END $$;

ALTER TABLE auth_session
  ADD CONSTRAINT auth_session_phase11_authentication_method
  CHECK (authentication_method IN ('oidc', 'recovery', 'setup', 'email'));
`;
