ALTER TABLE "PrivacyRequest"
  ADD COLUMN "clinicId" UUID,
  ADD COLUMN "requestKey" UUID,
  ADD COLUMN "details" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "response" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "respondedBy" UUID,
  ADD COLUMN "respondedAt" TIMESTAMPTZ,
  ADD COLUMN "dueAt" TIMESTAMPTZ;
-- Pedidos antigos não tinham clínica: preservar sem atribuir acesso administrativo por inferência.
UPDATE "PrivacyRequest" SET "dueAt" = "createdAt" + INTERVAL '15 days';
ALTER TABLE "PrivacyRequest" ALTER COLUMN "dueAt" SET NOT NULL;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT privacy_clinic_fk FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT privacy_status CHECK (status IN ('OPEN','IN_REVIEW','RESPONDED'));
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT privacy_response CHECK ((status = 'RESPONDED' AND length(trim(response)) >= 10 AND "respondedAt" IS NOT NULL AND "respondedBy" IS NOT NULL) OR (status <> 'RESPONDED' AND response = '' AND "respondedAt" IS NULL AND "respondedBy" IS NULL));
CREATE UNIQUE INDEX "PrivacyRequest_userId_requestKey_key" ON "PrivacyRequest"("userId", "requestKey");
CREATE INDEX "PrivacyRequest_clinicId_status_dueAt_idx" ON "PrivacyRequest"("clinicId", status, "dueAt");
