-- Creates the "notification" table backing the onboarding → active flow.
-- One row is written per superadmin when an onboarding induction completes
-- (see finalizeOnboardingActivation in src/app/induction/actions.ts), so this
-- table MUST exist before that transition can run in the target environment.
--
-- Idempotent and ADDITIVE ONLY — it creates a brand-new table and does not
-- touch any existing table or column, avoiding the schema-vs-DB drift a full
-- `prisma db push` can cause (see the working_hours incident in schema.prisma).
-- Safe to run more than once.
--
-- Apply in the environment that has DATABASE_URL set (staging/prod), e.g.:
--   npx prisma db execute \
--     --file prisma/manual/2026-06-11_add_notification_table.sql \
--     --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "notification" (
  "id"                SERIAL PRIMARY KEY,
  "recipient_user_id" INTEGER      NOT NULL,
  "type"              VARCHAR(50)  NOT NULL,
  "message"           TEXT         NOT NULL,
  "link"              VARCHAR(500),
  "is_read"           BOOLEAN      NOT NULL DEFAULT false,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE "notification"
    ADD CONSTRAINT "fk_notification_recipient"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_notification_recipient"
  ON "notification" ("recipient_user_id");
