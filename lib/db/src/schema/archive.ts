import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const archiveAdministration = pgEnum("archive_administration", [
  "FPS Bouw",
  "FPS Brandpreventie",
  "FPS Onderhoud",
  "FPS Bouw & Renovatie",
  "Futur Holding",
]);

export const archiveDataType = pgEnum("archive_data_type", [
  "sales_invoice",
  "purchase_invoice",
  "bank_transaction",
  "timesheet",
  "payroll_journal",
]);

export const archiveProvenance = pgEnum("archive_provenance", [
  "Connect",
  "AccountView",
  "manual_import",
]);

export const archiveCompletenessState = pgEnum("archive_completeness_state", [
  "complete",
  "partial",
  "not_loaded",
]);

/**
 * The source-faithful archive ledger.  Domain-specific fields live in payload
 * because the source formats differ and must not be normalized or inferred.
 */
export const archiveRecords = pgTable(
  "archive_records",
  {
    id: serial("id").primaryKey(),
    dataType: archiveDataType("data_type").notNull(),
    administration: archiveAdministration("administration").notNull(),
    periodDate: date("period_date", { mode: "string" }).notNull(),
    provenance: archiveProvenance("provenance").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    documentReference: text("document_reference"),
    storedChecksum: varchar("stored_checksum", { length: 64 }),
    isInternal: boolean("is_internal").notNull().default(false),
    // The trigger validates this self-reference on insert. Keeping it as a
    // scalar avoids a circular Drizzle initializer while preserving database enforcement.
    correctionOfId: integer("correction_of_id"),
    omissionNotes: text("omission_notes"),
  },
  (table) => [
    index("archive_records_admin_period_idx").on(
      table.administration,
      table.periodDate,
    ),
    index("archive_records_type_period_idx").on(table.dataType, table.periodDate),
    index("archive_records_correction_idx").on(table.correctionOfId),
  ],
);

/**
 * A separate immutable statement of coverage. More recent assessments append
 * another row rather than overwriting an earlier assertion of completeness.
 */
export const archiveCompleteness = pgTable(
  "archive_completeness",
  {
    id: serial("id").primaryKey(),
    administration: archiveAdministration("administration").notNull(),
    dataType: archiveDataType("data_type").notNull(),
    status: archiveCompletenessState("status").notNull(),
    completeFrom: date("complete_from", { mode: "string" }),
    presentFields: text("present_fields").array().notNull().default([]),
    missingFields: text("missing_fields").array().notNull().default([]),
    recordCount: integer("record_count").notNull().default(0),
    notes: text("notes"),
    assessedAt: timestamp("assessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("archive_completeness_admin_type_idx").on(
      table.administration,
      table.dataType,
      table.assessedAt,
    ),
  ],
);

export const insertArchiveRecordSchema = createInsertSchema(archiveRecords).omit({
  id: true,
  ingestedAt: true,
  archivedAt: true,
});
export const insertArchiveCompletenessSchema = createInsertSchema(
  archiveCompleteness,
).omit({ id: true, assessedAt: true });

export type ArchiveRecord = typeof archiveRecords.$inferSelect;
export type ArchiveCompleteness = typeof archiveCompleteness.$inferSelect;
export type InsertArchiveRecord = z.infer<typeof insertArchiveRecordSchema>;
export type InsertArchiveCompleteness = z.infer<
  typeof insertArchiveCompletenessSchema
>;