-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('PENDING', 'COMMAND_SENT', 'RELEASED', 'TAKEN', 'MISSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INFO', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('DISPENSE_SLOT', 'MANUAL_DISPENSE');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeviceEventType" AS ENUM ('BOOT', 'HEARTBEAT', 'CYCLE_SYNC', 'SLOT_RELEASED', 'SENSOR_DETECTED', 'DOSE_TAKEN', 'DOSE_MISSED', 'MOTOR_ERROR', 'COMMAND_ACK');

-- CreateTable
CREATE TABLE "caregivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "caregiver_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "patient_id" UUID NOT NULL,
    "wake_time" TEXT NOT NULL DEFAULT '06:00',
    "sleep_time" TEXT NOT NULL DEFAULT '22:00',
    "alarm_volume" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "instructions" TEXT,
    "first_dose_time" TEXT NOT NULL,
    "frequency_hours" INTEGER NOT NULL,
    "is_critical" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "device_code" TEXT NOT NULL,
    "device_token_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Dispenser principal',
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "current_compartment" INTEGER NOT NULL DEFAULT 1,
    "compartments_count" INTEGER NOT NULL DEFAULT 8,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refill_cycles" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "cycle_start" TIMESTAMP(3) NOT NULL,
    "cycle_end" TIMESTAMP(3) NOT NULL,
    "wake_time" TEXT NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refill_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refill_slots" (
    "id" UUID NOT NULL,
    "refill_cycle_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "compartment_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'PENDING',
    "released_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refill_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refill_slot_items" (
    "id" UUID NOT NULL,
    "refill_slot_id" UUID NOT NULL,
    "medication_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "dosage_snapshot" TEXT NOT NULL,
    "quantity_text" TEXT NOT NULL DEFAULT '1 dose',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refill_slot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_commands" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "refill_slot_id" UUID,
    "command_type" "CommandType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "ack_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_events" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "refill_slot_id" UUID,
    "event_type" "DeviceEventType" NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "device_id" UUID,
    "refill_slot_id" UUID,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caregivers_email_key" ON "caregivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "caregivers_phone_key" ON "caregivers"("phone");

-- CreateIndex
CREATE INDEX "patients_caregiver_id_idx" ON "patients"("caregiver_id");

-- CreateIndex
CREATE INDEX "medications_patient_id_idx" ON "medications"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_code_key" ON "devices"("device_code");

-- CreateIndex
CREATE INDEX "devices_patient_id_idx" ON "devices"("patient_id");

-- CreateIndex
CREATE INDEX "refill_cycles_patient_id_status_idx" ON "refill_cycles"("patient_id", "status");

-- CreateIndex
CREATE INDEX "refill_cycles_device_id_status_idx" ON "refill_cycles"("device_id", "status");

-- CreateIndex
CREATE INDEX "refill_slots_patient_id_scheduled_at_idx" ON "refill_slots"("patient_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "refill_slots_device_id_scheduled_at_idx" ON "refill_slots"("device_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "refill_slot_items_refill_slot_id_idx" ON "refill_slot_items"("refill_slot_id");

-- CreateIndex
CREATE INDEX "device_commands_device_id_status_idx" ON "device_commands"("device_id", "status");

-- CreateIndex
CREATE INDEX "device_events_device_id_created_at_idx" ON "device_events"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_patient_id_resolved_idx" ON "alerts"("patient_id", "resolved");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_preferences" ADD CONSTRAINT "patient_preferences_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_cycles" ADD CONSTRAINT "refill_cycles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_cycles" ADD CONSTRAINT "refill_cycles_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_slots" ADD CONSTRAINT "refill_slots_refill_cycle_id_fkey" FOREIGN KEY ("refill_cycle_id") REFERENCES "refill_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_slots" ADD CONSTRAINT "refill_slots_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_slots" ADD CONSTRAINT "refill_slots_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_slot_items" ADD CONSTRAINT "refill_slot_items_refill_slot_id_fkey" FOREIGN KEY ("refill_slot_id") REFERENCES "refill_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_slot_items" ADD CONSTRAINT "refill_slot_items_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_refill_slot_id_fkey" FOREIGN KEY ("refill_slot_id") REFERENCES "refill_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_refill_slot_id_fkey" FOREIGN KEY ("refill_slot_id") REFERENCES "refill_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_refill_slot_id_fkey" FOREIGN KEY ("refill_slot_id") REFERENCES "refill_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
