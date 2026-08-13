ALTER TABLE "agents" ADD COLUMN "onboarding_completed_at" timestamp with time zone;
UPDATE "agents" SET "onboarding_completed_at" = now();
