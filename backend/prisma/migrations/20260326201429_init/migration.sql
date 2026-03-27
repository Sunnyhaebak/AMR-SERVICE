-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'ENGINEER');

-- CreateEnum
CREATE TYPE "AttendanceState" AS ENUM ('PLANNED', 'PRESENT', 'ABSENT', 'OVERRIDE_PENDING', 'OVERRIDDEN', 'MANUAL_APPROVED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANAGER_MARKED', 'ENGINEER_CHECKIN');

-- CreateEnum
CREATE TYPE "TicketState" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('REPAIR', 'CHANGE');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('HARDWARE', 'SOFTWARE');

-- CreateEnum
CREATE TYPE "SmrState" AS ENUM ('REQUESTED', 'ASSIGNED_TO_ENGINEER', 'APPROVED_BY_ENGINEER', 'APPROVED_BY_MANAGER', 'REJECTED', 'SYNCED_TO_ERP');

-- CreateEnum
CREATE TYPE "SmrSource" AS ENUM ('ZENDESK_ZAF', 'MANAGER_DIRECT', 'ENGINEER_REQUEST');

-- CreateEnum
CREATE TYPE "ErpStatus" AS ENUM ('DRAFT', 'APPROVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ChangeRecordType" AS ENUM ('BOT_LEVEL', 'CUSTOMER_LEVEL');

-- CreateEnum
CREATE TYPE "ChangeHistoryStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" "Role"[],
    "manager_id" UUID,
    "default_landing_page" TEXT,
    "page_access" JSONB,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "engineer_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "state" "AttendanceState" NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "check_in_lat" DOUBLE PRECISION,
    "check_in_lng" DOUBLE PRECISION,
    "check_out_lat" DOUBLE PRECISION,
    "check_out_lng" DOUBLE PRECISION,
    "source" "AttendanceSource" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticket_number" SERIAL NOT NULL,
    "state" "TicketState" NOT NULL DEFAULT 'PENDING',
    "manager_id" UUID NOT NULL,
    "assigned_engineer_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_location" TEXT NOT NULL,
    "site_id" UUID NOT NULL,
    "bot_number" TEXT,
    "zendesk_ticket_id" TEXT,
    "service_type" "ServiceType" NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "change_subtype" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "actual_completion_date" DATE,
    "rejection_history" JSONB,
    "images" JSONB,
    "engineer_form_data" JSONB,
    "notes" TEXT,
    "days_taken" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smr_requests" (
    "id" UUID NOT NULL,
    "state" "SmrState" NOT NULL DEFAULT 'REQUESTED',
    "source" "SmrSource" NOT NULL,
    "ticket_id" UUID,
    "requested_by" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "assigned_engineer_id" UUID,
    "items" JSONB NOT NULL,
    "customer_name" TEXT NOT NULL,
    "site_id" UUID NOT NULL,
    "rejection_reason" TEXT,
    "idempotency_key" TEXT,
    "erp_id" TEXT,
    "erp_status" "ErpStatus",
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bots" (
    "id" UUID NOT NULL,
    "bot_number" TEXT NOT NULL,
    "site_id" UUID NOT NULL,
    "model" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amr_change_history" (
    "id" UUID NOT NULL,
    "record_type" "ChangeRecordType" NOT NULL,
    "site_id" UUID NOT NULL,
    "bot_id" UUID,
    "ticket_id" UUID NOT NULL,
    "smr_id" UUID,
    "zendesk_ticket_id" TEXT,
    "engineer_id" UUID NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "change_subtype" TEXT NOT NULL,
    "status" "ChangeHistoryStatus" NOT NULL DEFAULT 'PENDING',
    "date" DATE NOT NULL,
    "time_taken_days" INTEGER,
    "smr_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amr_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_state" TEXT,
    "new_state" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_engineer_id_attendance_date_key" ON "attendance_records"("engineer_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "smr_requests_idempotency_key_key" ON "smr_requests"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_engineer_id_fkey" FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smr_requests" ADD CONSTRAINT "smr_requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smr_requests" ADD CONSTRAINT "smr_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smr_requests" ADD CONSTRAINT "smr_requests_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smr_requests" ADD CONSTRAINT "smr_requests_assigned_engineer_id_fkey" FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smr_requests" ADD CONSTRAINT "smr_requests_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_change_history" ADD CONSTRAINT "amr_change_history_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_change_history" ADD CONSTRAINT "amr_change_history_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_change_history" ADD CONSTRAINT "amr_change_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_change_history" ADD CONSTRAINT "amr_change_history_smr_id_fkey" FOREIGN KEY ("smr_id") REFERENCES "smr_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amr_change_history" ADD CONSTRAINT "amr_change_history_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
