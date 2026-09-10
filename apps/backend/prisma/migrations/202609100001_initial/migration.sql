-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'THERAPIST', 'ADMIN', 'RECEPTION');

-- CreateEnum
CREATE TYPE "AppointmentState" AS ENUM ('SCHEDULED', 'PENDING', 'EXPIRED', 'CONFIRMED', 'CANCELLED', 'ATTENDED', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Recife',
    "particular" BOOLEAN NOT NULL DEFAULT false,
    "absenceLimit" INTEGER NOT NULL DEFAULT 3,
    "justificationDays" INTEGER NOT NULL DEFAULT 3,
    "evaluationDays" INTEGER NOT NULL DEFAULT 180,
    "reviewDays" INTEGER NOT NULL DEFAULT 7,
    "confirmationHour" INTEGER NOT NULL DEFAULT 18,
    "closeHours" INTEGER NOT NULL DEFAULT 2,
    "retentionDays" INTEGER NOT NULL DEFAULT 180,
    "replacementPerAbsence" INTEGER NOT NULL DEFAULT 2,
    "replacementPerWindow" INTEGER NOT NULL DEFAULT 4,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCategories" TEXT[] DEFAULT ARRAY['SAUDE_PACIENTE', 'SAUDE_DEPENDENTE', 'FORCA_MAIOR']::TEXT[],

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canReview" BOOLEAN NOT NULL DEFAULT false,
    "birthDate" DATE,
    "registration" TEXT NOT NULL DEFAULT '',
    "absenceLimit" INTEGER,
    "justificationDays" INTEGER,
    "resetAt" TIMESTAMPTZ,
    "suspendedUntil" TIMESTAMPTZ,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "membershipId" UUID,
    "csrf" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "until" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 50,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "minAge" INTEGER NOT NULL DEFAULT 0,
    "maxAge" INTEGER NOT NULL DEFAULT 120,
    "room" TEXT NOT NULL DEFAULT 'Sala 1',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "groupOffering" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssignment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FixedAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "originalId" UUID,
    "origin" TEXT NOT NULL DEFAULT 'FIXED',
    "status" "AppointmentState" NOT NULL DEFAULT 'SCHEDULED',
    "opensAt" TIMESTAMPTZ NOT NULL,
    "closesAt" TIMESTAMPTZ NOT NULL,
    "confirmedAt" TIMESTAMPTZ,
    "cancelledAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL,
    "deadline" TIMESTAMPTZ NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PROVISIONAL',
    "reason" TEXT NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "absenceId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "declaredDate" TEXT,
    "prevalidation" TEXT NOT NULL DEFAULT 'INCONCLUSIVE_DECLARED_DATE',
    "status" "Decision" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewAt" TIMESTAMPTZ NOT NULL,
    "decidedAt" TIMESTAMPTZ,
    "decidedBy" TEXT,
    "reason" TEXT,
    "appealAt" TIMESTAMPTZ,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "certificateId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "failure" TEXT,
    "purgedAt" TIMESTAMPTZ,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FittingRequest" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "originalId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "Decision" NOT NULL DEFAULT 'PENDING',
    "appointmentId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ,
    "reason" TEXT,

    CONSTRAINT "FittingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "requestId" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" BIGSERIAL NOT NULL,
    "clinicId" UUID,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "clinicId" UUID,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMPTZ,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "clinicId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failure" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "document" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_clinicId_role_idx" ON "Membership"("clinicId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_clinicId_role_key" ON "Membership"("userId", "clinicId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_id_clinicId_key" ON "Membership"("id", "clinicId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Slot_clinicId_therapistId_idx" ON "Slot"("clinicId", "therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_id_clinicId_key" ON "Slot"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_therapistId_weekday_minute_key" ON "Slot"("therapistId", "weekday", "minute");

-- CreateIndex
CREATE INDEX "FixedAssignment_clinicId_patientId_active_idx" ON "FixedAssignment"("clinicId", "patientId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAssignment_slotId_patientId_key" ON "FixedAssignment"("slotId", "patientId");

-- CreateIndex
CREATE INDEX "Occurrence_clinicId_startsAt_idx" ON "Occurrence"("clinicId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Occurrence_slotId_startsAt_key" ON "Occurrence"("slotId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Occurrence_id_clinicId_key" ON "Occurrence"("id", "clinicId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_patientId_status_idx" ON "Appointment"("clinicId", "patientId", "status");

-- CreateIndex
CREATE INDEX "Appointment_status_opensAt_closesAt_idx" ON "Appointment"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_occurrenceId_patientId_key" ON "Appointment"("occurrenceId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_clinicId_key" ON "Appointment"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_patientId_weekday_startMinute_key" ON "Availability"("patientId", "weekday", "startMinute");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_appointmentId_key" ON "Absence"("appointmentId");

-- CreateIndex
CREATE INDEX "Absence_clinicId_patientId_state_occurredAt_idx" ON "Absence"("clinicId", "patientId", "state", "occurredAt");

-- CreateIndex
CREATE INDEX "Absence_state_deadline_idx" ON "Absence"("state", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_id_clinicId_key" ON "Absence"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_absenceId_key" ON "Certificate"("absenceId");

-- CreateIndex
CREATE INDEX "Certificate_clinicId_status_submittedAt_idx" ON "Certificate"("clinicId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "Certificate_status_reviewAt_idx" ON "Certificate"("status", "reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_id_clinicId_key" ON "Certificate"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");

-- CreateIndex
CREATE INDEX "Attachment_certificateId_clinicId_idx" ON "Attachment"("certificateId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "FittingRequest_appointmentId_key" ON "FittingRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "FittingRequest_occurrenceId_status_idx" ON "FittingRequest"("occurrenceId", "status");

-- CreateIndex
CREATE INDEX "FittingRequest_clinicId_patientId_idx" ON "FittingRequest"("clinicId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "FittingRequest_id_clinicId_key" ON "FittingRequest"("id", "clinicId");

-- CreateIndex
CREATE INDEX "Reservation_occurrenceId_active_idx" ON "Reservation"("occurrenceId", "active");

-- CreateIndex
CREATE INDEX "Audit_clinicId_createdAt_idx" ON "Audit"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "Outbox_dispatchedAt_createdAt_idx" ON "Outbox"("dispatchedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_clinicId_userId_createdAt_idx" ON "Notification"("clinicId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_clinicId_endsAt_idx" ON "Alert"("clinicId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_userId_document_version_key" ON "Consent"("userId", "document", "version");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Slot" ADD CONSTRAINT "Slot_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_therapistId_tenant_fk" FOREIGN KEY ("therapistId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "FixedAssignment" ADD CONSTRAINT "FixedAssignment_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "FixedAssignment" ADD CONSTRAINT "FixedAssignment_slotId_tenant_fk" FOREIGN KEY ("slotId","clinicId") REFERENCES "Slot"(id,"clinicId");
ALTER TABLE "FixedAssignment" ADD CONSTRAINT "FixedAssignment_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_slotId_tenant_fk" FOREIGN KEY ("slotId","clinicId") REFERENCES "Slot"(id,"clinicId");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_occurrenceId_tenant_fk" FOREIGN KEY ("occurrenceId","clinicId") REFERENCES "Occurrence"(id,"clinicId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_originalId_tenant_fk" FOREIGN KEY ("originalId","clinicId") REFERENCES "Appointment"(id,"clinicId");

ALTER TABLE "Availability" ADD CONSTRAINT "Availability_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "Absence" ADD CONSTRAINT "Absence_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_appointmentId_tenant_fk" FOREIGN KEY ("appointmentId","clinicId") REFERENCES "Appointment"(id,"clinicId");
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_absenceId_tenant_fk" FOREIGN KEY ("absenceId","clinicId") REFERENCES "Absence"(id,"clinicId");
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_certificateId_tenant_fk" FOREIGN KEY ("certificateId","clinicId") REFERENCES "Certificate"(id,"clinicId");

ALTER TABLE "FittingRequest" ADD CONSTRAINT "FittingRequest_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "FittingRequest" ADD CONSTRAINT "FittingRequest_occurrenceId_tenant_fk" FOREIGN KEY ("occurrenceId","clinicId") REFERENCES "Occurrence"(id,"clinicId");
ALTER TABLE "FittingRequest" ADD CONSTRAINT "FittingRequest_originalId_tenant_fk" FOREIGN KEY ("originalId","clinicId") REFERENCES "Appointment"(id,"clinicId");
ALTER TABLE "FittingRequest" ADD CONSTRAINT "FittingRequest_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");
ALTER TABLE "FittingRequest" ADD CONSTRAINT "FittingRequest_appointmentId_tenant_fk" FOREIGN KEY ("appointmentId","clinicId") REFERENCES "Appointment"(id,"clinicId");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clinic_fk" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id);
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_requestId_tenant_fk" FOREIGN KEY ("requestId","clinicId") REFERENCES "FittingRequest"(id,"clinicId");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_occurrenceId_tenant_fk" FOREIGN KEY ("occurrenceId","clinicId") REFERENCES "Occurrence"(id,"clinicId");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_patientId_tenant_fk" FOREIGN KEY ("patientId","clinicId") REFERENCES "Membership"(id,"clinicId");

ALTER TABLE "Session" ADD CONSTRAINT session_membership_fk FOREIGN KEY ("membershipId") REFERENCES "Membership"(id);
ALTER TABLE "Clinic" ADD CONSTRAINT clinic_parameters CHECK ("absenceLimit">0 AND "justificationDays">0 AND "evaluationDays">0 AND "reviewDays">0 AND "closeHours">=2 AND "confirmationHour" BETWEEN 0 AND 23 AND "retentionDays">0 AND "replacementPerAbsence">0 AND "replacementPerWindow">0);
ALTER TABLE "Membership" ADD CONSTRAINT individual_parameters CHECK (("absenceLimit" IS NULL OR "absenceLimit">0) AND ("justificationDays" IS NULL OR "justificationDays">0));
ALTER TABLE "Slot" ADD CONSTRAINT slot_parameters CHECK (weekday BETWEEN 0 AND 6 AND minute BETWEEN 0 AND 1439 AND duration BETWEEN 1 AND 1440 AND minute+duration<=1440 AND capacity>0 AND "minAge">=0 AND "maxAge">="minAge");
ALTER TABLE "Occurrence" ADD CONSTRAINT occurrence_time CHECK ("endsAt">"startsAt");
ALTER TABLE "Availability" ADD CONSTRAINT availability_time CHECK (weekday BETWEEN 0 AND 6 AND "startMinute">=0 AND "endMinute"<=1440 AND "endMinute">"startMinute");
ALTER TABLE "Absence" ADD CONSTRAINT absence_state CHECK (state IN ('PROVISIONAL','CONSOLIDATED','EXCUSED'));
ALTER TABLE "Attachment" ADD CONSTRAINT attachment_state CHECK (status IN ('QUARANTINED','CLEAN','REJECTED','PURGED') AND size BETWEEN 1 AND 10485760);
CREATE UNIQUE INDEX request_pending_once ON "FittingRequest"("patientId","occurrenceId","originalId") WHERE status='PENDING';
CREATE FUNCTION audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END; $$;
CREATE TRIGGER protect_audit BEFORE UPDATE OR DELETE ON "Audit" FOR EACH ROW EXECUTE FUNCTION audit_append_only();
