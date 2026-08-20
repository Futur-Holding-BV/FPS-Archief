import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  AddArchiveCorrectionBody,
  AddArchiveCorrectionParams,
  AddArchiveCorrectionResponse,
  ExportArchiveQueryParams,
  GetArchiveCompletenessQueryParams,
  GetArchiveCompletenessResponse,
  GetArchiveRecordParams,
  GetArchiveRecordResponse,
  GetArchiveSummaryQueryParams,
  GetArchiveSummaryResponse,
  GetConsolidationQueryParams,
  GetConsolidationResponse,
  ListArchiveRecordsQueryParams,
  ListArchiveRecordsResponse,
  VerifyArchiveDocumentParams,
  VerifyArchiveDocumentResponse,
} from "@workspace/api-zod";
import {
  archiveCompleteness,
  archiveRecords,
  db,
  type ArchiveRecord,
} from "@workspace/db";

const router: IRouter = Router();

const administrations = [
  "FPS Bouw",
  "FPS Brandpreventie",
  "FPS Onderhoud",
  "FPS Bouw & Renovatie",
  "Futur Holding",
] as const;

const dataTypes = [
  "sales_invoice",
  "purchase_invoice",
  "bank_transaction",
  "timesheet",
  "payroll_journal",
] as const;

type ArchivePayload = Record<string, unknown>;

function getSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

function parseDateQuery(value: unknown): Date | undefined {
  const raw = getSingleQueryValue(value);
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function queryWithDates(req: Request): Record<string, unknown> {
  return {
    ...req.query,
    periodFrom: parseDateQuery(req.query.periodFrom),
    periodTo: parseDateQuery(req.query.periodTo),
  };
}

function dateOnly(value: Date | undefined): string | undefined {
  return value?.toISOString().slice(0, 10);
}

function numericPayloadValue(payload: ArchivePayload, key: string): number {
  const raw = payload[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function recordSearchText(record: ArchiveRecord): string {
  return [
    record.administration,
    record.dataType,
    record.periodDate,
    record.provenance,
    JSON.stringify(record.payload),
    record.documentReference ?? "",
    record.omissionNotes ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function customerOrSupplier(payload: ArchivePayload): string {
  const candidate =
    payload.customerName ?? payload.supplier ?? payload.employee ?? payload.description;
  return typeof candidate === "string" ? candidate : "";
}

function publicRecord(record: ArchiveRecord) {
  return {
    ...record,
    payload: record.payload,
    documentReference: record.documentReference ?? null,
    storedChecksum: record.storedChecksum ?? null,
    correctionOfId: record.correctionOfId ?? null,
    omissionNotes: record.omissionNotes ?? null,
  };
}

async function recordsForFilters(input: {
  administration?: (typeof administrations)[number];
  dataType?: (typeof dataTypes)[number];
  periodFrom?: Date;
  periodTo?: Date;
  search?: string;
  limit?: number;
}): Promise<ArchiveRecord[]> {
  const conditions = [];
  const start = dateOnly(input.periodFrom);
  const end = dateOnly(input.periodTo);

  if (input.administration) {
    conditions.push(eq(archiveRecords.administration, input.administration));
  }
  if (input.dataType) {
    conditions.push(eq(archiveRecords.dataType, input.dataType));
  }
  if (start) {
    conditions.push(gte(archiveRecords.periodDate, start));
  }
  if (end) {
    conditions.push(lte(archiveRecords.periodDate, end));
  }

  const rows = await db
    .select()
    .from(archiveRecords)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(archiveRecords.periodDate), desc(archiveRecords.id));

  const search = input.search?.trim().toLocaleLowerCase();
  const matching = search
    ? rows.filter((record) => recordSearchText(record).includes(search))
    : rows;

  return typeof input.limit === "number"
    ? matching.slice(0, input.limit)
    : matching;
}

async function latestCompleteness(administration?: string) {
  const rows = await db
    .select()
    .from(archiveCompleteness)
    .where(
      administration
        ? eq(
            archiveCompleteness.administration,
            administration as (typeof administrations)[number],
          )
        : undefined,
    )
    .orderBy(desc(archiveCompleteness.assessedAt), desc(archiveCompleteness.id));

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.administration}:${row.dataType}`;
    if (!latest.has(key)) {
      latest.set(key, row);
    }
  }

  const selectedAdministrations = administration
    ? administrations.filter((name) => name === administration)
    : administrations;

  return selectedAdministrations.flatMap((administrationName) =>
    dataTypes.map((dataType) => {
      const row = latest.get(`${administrationName}:${dataType}`);
      return {
        administration: administrationName,
        dataType,
        status: row?.status ?? "not_loaded",
        completeFrom: row?.completeFrom ?? null,
        presentFields: row?.presentFields ?? [],
        missingFields: row?.missingFields ?? ["No archive import assessment recorded"],
        recordCount: row?.recordCount ?? 0,
      };
    }),
  );
}

function toCsv(records: ArchiveRecord[]): string {
  const header = [
    "id",
    "data_type",
    "administration",
    "period_date",
    "provenance",
    "internal",
    "correction_of_id",
    "counterparty",
    "total_amount",
    "outstanding_amount",
    "document_reference",
    "stored_checksum",
    "omission_notes",
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = records.map((record) => {
    const payload = record.payload as ArchivePayload;
    return [
      record.id,
      record.dataType,
      record.administration,
      record.periodDate,
      record.provenance,
      record.isInternal,
      record.correctionOfId,
      customerOrSupplier(payload),
      numericPayloadValue(payload, "totalAmount"),
      numericPayloadValue(payload, "outstandingAmount"),
      record.documentReference,
      record.storedChecksum,
      record.omissionNotes,
    ]
      .map(escape)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

router.get("/archive/summary", async (req, res): Promise<void> => {
  const parsed = GetArchiveSummaryQueryParams.safeParse(queryWithDates(req));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const records = await recordsForFilters(parsed.data);
  const completeness = await latestCompleteness(parsed.data.administration);
  const completeScore = completeness.reduce(
    (total, row) =>
      total + (row.status === "complete" ? 1 : row.status === "partial" ? 0.5 : 0),
    0,
  );

  const data = {
    revenue: records
      .filter((record) => record.dataType === "sales_invoice")
      .reduce(
        (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
        0,
      ),
    purchases: records
      .filter((record) => record.dataType === "purchase_invoice")
      .reduce(
        (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
        0,
      ),
    hours: records
      .filter((record) => record.dataType === "timesheet")
      .reduce((sum, record) => sum + numericPayloadValue(record.payload, "hours"), 0),
    receivables: records
      .filter((record) => record.dataType === "sales_invoice")
      .reduce(
        (sum, record) =>
          sum + numericPayloadValue(record.payload, "outstandingAmount"),
        0,
      ),
    payables: records
      .filter((record) => record.dataType === "purchase_invoice")
      .reduce(
        (sum, record) =>
          sum + numericPayloadValue(record.payload, "outstandingAmount"),
        0,
      ),
    recordCount: records.length,
    internalInvoiceCount: records.filter(
      (record) => record.dataType === "sales_invoice" && record.isInternal,
    ).length,
    completenessPercent: Math.round(
      (completeScore / Math.max(completeness.length, 1)) * 100,
    ),
  };

  res.json(GetArchiveSummaryResponse.parse(data));
});

router.get("/archive/completeness", async (req, res): Promise<void> => {
  const parsed = GetArchiveCompletenessQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.json(GetArchiveCompletenessResponse.parse(await latestCompleteness(parsed.data.administration)));
});

router.get("/archive/records", async (req, res): Promise<void> => {
  const parsed = ListArchiveRecordsQueryParams.safeParse(queryWithDates(req));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const records = await recordsForFilters(parsed.data);
  res.json(ListArchiveRecordsResponse.parse(records.map(publicRecord)));
});

router.get("/archive/records/:id", async (req, res): Promise<void> => {
  const parsed = GetArchiveRecordParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db
    .select()
    .from(archiveRecords)
    .where(eq(archiveRecords.id, parsed.data.id));
  if (!record) {
    res.status(404).json({ error: "Archive record not found" });
    return;
  }

  res.json(GetArchiveRecordResponse.parse(publicRecord(record)));
});

router.post("/archive/records/:id", async (req, res): Promise<void> => {
  const params = AddArchiveCorrectionParams.safeParse(req.params);
  const body = AddArchiveCorrectionBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [source] = await db
    .select({ id: archiveRecords.id })
    .from(archiveRecords)
    .where(eq(archiveRecords.id, params.data.id));
  if (!source) {
    res.status(404).json({ error: "Archive record not found" });
    return;
  }

  try {
    const [record] = await db
      .insert(archiveRecords)
      .values({
        ...body.data,
        periodDate: body.data.periodDate.toISOString().slice(0, 10),
        documentReference: body.data.documentReference ?? null,
        storedChecksum: body.data.storedChecksum ?? null,
        correctionOfId: params.data.id,
      })
      .returning();

    res.status(201).json(AddArchiveCorrectionResponse.parse(publicRecord(record)));
  } catch (error) {
    req.log.warn({ err: error, recordId: params.data.id }, "Correction rejected by immutable archive rule");
    res.status(409).json({
      error:
        error instanceof Error
          ? error.message
          : "Correction could not be appended",
    });
  }
});

router.get("/archive/records/:id/document-integrity", async (req, res): Promise<void> => {
  const parsed = VerifyArchiveDocumentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db
    .select()
    .from(archiveRecords)
    .where(eq(archiveRecords.id, parsed.data.id));
  if (!record) {
    res.status(404).json({ error: "Archive record not found" });
    return;
  }

  const base = {
    recordId: record.id,
    documentReference: record.documentReference ?? null,
    storedChecksum: record.storedChecksum ?? null,
    checkedAt: new Date(),
  };

  if (!record.documentReference || !record.storedChecksum) {
    res.json(
      VerifyArchiveDocumentResponse.parse({
        ...base,
        status: "not_referenced",
        message: "No document reference and checksum are stored for this archive row.",
      }),
    );
    return;
  }

  const root = process.env.NAS_READONLY_ROOT;
  const normalReference = record.documentReference.replaceAll("\\", "/");
  const unsafeReference =
    normalReference.startsWith("/") ||
    normalReference.includes("../") ||
    normalReference.includes("://");
  if (!root || unsafeReference) {
    res.json(
      VerifyArchiveDocumentResponse.parse({
        ...base,
        status: "unavailable",
        message: root
          ? "The document reference is not an allowed relative path under the read-only NAS mount."
          : "NAS verification is not configured. Only a read-only NAS mount path is required; credentials are never stored here.",
      }),
    );
    return;
  }

  const target = path.resolve(root, normalReference);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    res.json(
      VerifyArchiveDocumentResponse.parse({
        ...base,
        status: "unavailable",
        message: "The document reference resolves outside the read-only NAS mount.",
      }),
    );
    return;
  }

  try {
    const contents = await readFile(target);
    const actualChecksum = createHash("sha256").update(contents).digest("hex");
    const status = actualChecksum === record.storedChecksum ? "verified" : "mismatch";
    res.json(
      VerifyArchiveDocumentResponse.parse({
        ...base,
        status,
        actualChecksum,
        message:
          status === "verified"
            ? "Referenced NAS document matches the stored SHA-256 checksum."
            : "Checksum mismatch: the referenced NAS document no longer matches this immutable archive row.",
      }),
    );
  } catch (error) {
    req.log.warn({ err: error, recordId: record.id }, "NAS document could not be read");
    res.json(
      VerifyArchiveDocumentResponse.parse({
        ...base,
        status: "unavailable",
        message: "The referenced NAS document could not be read through the configured read-only mount.",
      }),
    );
  }
});

router.get("/archive/consolidation", async (req, res): Promise<void> => {
  const parsed = GetConsolidationQueryParams.safeParse(queryWithDates(req));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const records = await recordsForFilters(parsed.data);
  const sales = records.filter((record) => record.dataType === "sales_invoice");
  const purchases = records.filter(
    (record) => record.dataType === "purchase_invoice",
  );
  const internalSales = sales.filter((record) => record.isInternal);
  const grossRevenue = sales.reduce(
    (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
    0,
  );
  const internalEliminations = internalSales.reduce(
    (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
    0,
  );

  const data = {
    grossRevenue,
    internalEliminations,
    consolidatedRevenue: grossRevenue - internalEliminations,
    grossPurchases: purchases.reduce(
      (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
      0,
    ),
    consolidatedPurchases: purchases.reduce(
      (sum, record) => sum + numericPayloadValue(record.payload, "netAmount"),
      0,
    ),
    eliminations: internalSales.map((record) => {
      const payload = record.payload as ArchivePayload;
      const counterparty = payload.counterpartyAdministration;
      return {
        recordId: record.id,
        invoiceNumber:
          typeof payload.invoiceNumber === "string"
            ? payload.invoiceNumber
            : `archive-row-${record.id}`,
        fromAdministration: record.administration,
        toAdministration:
          typeof counterparty === "string" &&
          administrations.includes(
            counterparty as (typeof administrations)[number],
          )
            ? (counterparty as (typeof administrations)[number])
            : record.administration,
        amount: numericPayloadValue(payload, "netAmount"),
        reason: "Marked internal at ingestion; eliminated from consolidated revenue.",
      };
    }),
  };

  res.json(GetConsolidationResponse.parse(data));
});

router.get("/archive/export", async (req, res): Promise<void> => {
  const parsed = ExportArchiveQueryParams.safeParse(queryWithDates(req));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const dataType = dataTypes.includes(
    parsed.data.dataType as (typeof dataTypes)[number],
  )
    ? (parsed.data.dataType as (typeof dataTypes)[number])
    : undefined;
  const records = await recordsForFilters({ ...parsed.data, dataType });

  if (parsed.data.format === "csv") {
    res
      .status(200)
      .type("text/csv")
      .attachment("archief-01-export.csv")
      .send(toCsv(records));
    return;
  }

  res
    .status(200)
    .type("application/json")
    .attachment("archief-01-export.json")
    .json(records.map(publicRecord));
});

export default router;