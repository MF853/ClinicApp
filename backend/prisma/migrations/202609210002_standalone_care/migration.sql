ALTER TABLE "FittingRequest" ALTER COLUMN "originalId" DROP NOT NULL;
CREATE UNIQUE INDEX care_request_pending_once ON "FittingRequest"("patientId", "occurrenceId") WHERE "originalId" IS NULL AND status = 'PENDING';
