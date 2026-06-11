-- Adds employment.reports_to_user_id (nullable FK → users.user_id) for the
-- Assign Role "Reporting To" field. Idempotent and ADDITIVE ONLY — it does
-- not touch any other column, so it avoids the schema-vs-DB drift that a full
-- `prisma db push` can cause (see the working_hours incident noted in
-- schema.prisma). Safe to run more than once.
--
-- Apply in the environment that has DATABASE_URL set (staging/prod), e.g.:
--   npx prisma db execute \
--     --file prisma/manual/2026-06-10_add_employment_reports_to.sql \
--     --schema prisma/schema.prisma
--
-- IMPORTANT: assignCandidateRole() now writes reports_to_user_id, so this
-- column MUST exist before the Assign Role flow is used in that environment.

ALTER TABLE "employment"
  ADD COLUMN IF NOT EXISTS "reports_to_user_id" INTEGER;

DO $$
BEGIN
  ALTER TABLE "employment"
    ADD CONSTRAINT "fk_employment_reports_to"
    FOREIGN KEY ("reports_to_user_id") REFERENCES "users"("user_id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_employment_reports_to"
  ON "employment" ("reports_to_user_id");
