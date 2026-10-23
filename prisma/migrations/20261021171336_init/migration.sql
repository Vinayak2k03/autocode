-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "repository_source_type" AS ENUM ('github_public', 'zip');

-- CreateEnum
CREATE TYPE "repository_status" AS ENUM ('pending', 'indexing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('queued', 'investigating', 'awaiting_approval', 'implementing', 'testing', 'completed', 'failed', 'cancelled', 'paused');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" "repository_source_type" NOT NULL,
    "source_url" TEXT,
    "default_branch" TEXT,
    "head_sha" TEXT,
    "status" "repository_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "repository_id" UUID,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'queued',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_owner_id_created_at_idx" ON "projects"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "projects_owner_id_name_key" ON "projects"("owner_id", "name");

-- CreateIndex
CREATE INDEX "repositories_project_id_idx" ON "repositories"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_project_id_name_key" ON "repositories"("project_id", "name");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_repository_id_idx" ON "tasks"("repository_id");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Custom SQL (hand-edited after `prisma migrate diff`):
--   * profiles.id references auth.users(id) ON DELETE CASCADE
--   * handle_new_user() trigger -> auto-create profile rows
--   * CHECK constraints matching the app-level Zod limits (src/config/app.ts)
--   * Row Level Security + GRANT lockdown (see README "Security model")
-- ---------------------------------------------------------------------------

-- Link profiles to Supabase auth.users so deleting an auth user removes the
-- profile (and cascades to that user's projects/repositories/tasks).
ALTER TABLE "profiles"
    ADD CONSTRAINT "profiles_id_fkey"
    FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
    ON DELETE CASCADE;

-- Auto-create a profile row whenever a new auth user signs up.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO "public"."profiles" ("id", "display_name", "created_at", "updated_at")
    VALUES (NEW."id", NEW."email", now(), now())
    ON CONFLICT ("id") DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_new_user"();

-- Length bounds matching the Zod limits in src/config/app.ts.
ALTER TABLE "projects"
    ADD CONSTRAINT "projects_name_length_check"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "projects"
    ADD CONSTRAINT "projects_description_length_check"
    CHECK ("description" IS NULL OR char_length("description") <= 1000);

ALTER TABLE "repositories"
    ADD CONSTRAINT "repositories_name_length_check"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 100);

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_title_length_check"
    CHECK (char_length(btrim("title")) BETWEEN 1 AND 200);
ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_description_length_check"
    CHECK ("description" IS NULL OR char_length("description") <= 5000);

-- Row Level Security (defense in depth). No policies are created for
-- anon/authenticated, so the Supabase Data API (PostgREST) cannot read or
-- write these tables with the publishable key. The app connects with a
-- server-only role that bypasses RLS; authorization is enforced in the
-- service layer. See README "Security model".
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repositories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
ALTER TABLE "repositories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

-- Lock down direct table access from the Supabase API roles.
REVOKE ALL ON "profiles" FROM "anon", "authenticated";
REVOKE ALL ON "projects" FROM "anon", "authenticated";
REVOKE ALL ON "repositories" FROM "anon", "authenticated";
REVOKE ALL ON "tasks" FROM "anon", "authenticated";

-- The trigger function must not be callable by anyone but the trigger.
REVOKE EXECUTE ON FUNCTION "public"."handle_new_user"() FROM "public", "anon", "authenticated";
