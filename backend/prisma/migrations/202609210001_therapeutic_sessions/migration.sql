ALTER TYPE "AppointmentState" ADD VALUE 'RELEASED';
ALTER TABLE "FixedAssignment" ADD COLUMN "blockedAt" TIMESTAMPTZ;
ALTER TABLE "FixedAssignment" ADD CONSTRAINT "blocked_assignment_inactive" CHECK ("blockedAt" IS NULL OR NOT "active");
