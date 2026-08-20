# FPS-Archief — archive architecture

## Purpose and scope

FPS-Archief is an immutable, read-only administrative archive for:

- FPS Bouw
- FPS Brandpreventie
- FPS Onderhoud
- FPS Bouw & Renovatie
- Futur Holding

It supports audit questions, reconciliations, historical lookup, aggregation, and export. It is deliberately **not** accounting software: it has no daily booking flow, approvals, payment batches, VAT returns, or write-back path to any other system.

## Administration separation

Every archive row has one required `administration` value from the five-name closed list. The archive never uses a shared “group” administration for source data. Group-level reporting is calculated from the separate rows and exposes internal eliminations rather than hiding them.

Futur Holding is present as a first-class administration; it is not represented as a tag or a special case.

## Durable, source-faithful storage

PostgreSQL is the system of record. The `archive_records` ledger holds every data domain:

| Domain | Stored source-faithful content |
| --- | --- |
| Sales invoices | Invoice number, invoice-date details, customer values, lines, VAT, total, due date |
| Purchase invoices | Supplier, supplier invoice number, date, amounts, VAT, project/cost category |
| Bank transactions | Date, amount, counterparty account, description, source account |
| Timesheets | Employee, date, hours, project, employing BV |
| Payroll journal entries | Period, administration, processor-supplied entries |

The ledger has a structured common envelope and a `payload` for source-specific fields. This preserves the differences between Connect, AccountView, and manual import without fabricating a normalized value that a source did not provide.

Each row also records:

- `provenance`: `Connect`, `AccountView`, or `manual_import`
- `ingested_at` and `archived_at`
- an optional NAS document reference and SHA-256 checksum
- an internal-invoice flag
- explicit omission notes
- an optional `correction_of_id`

No NAS file bytes are stored in the database.

## Database-enforced immutability

Immutability is not a UI convention. The database installs `BEFORE UPDATE OR DELETE` triggers on both the archive ledger and the completeness ledger. Any direct update or delete statement is rejected with an append-only error, including statements issued outside the web interface.

The only permitted change to archived content is an insert:

1. The original row remains unchanged.
2. A new archive row is inserted with `correction_of_id` pointing to the original.
3. The database trigger verifies that the correction exists and remains in the same administration and data type.
4. The web interface displays the link rather than presenting the correction as an overwrite.

The insert trigger also rejects a stored checksum that is not a 64-character SHA-256 hexadecimal value.

## Completeness and missing data

`archive_completeness` is a separate append-only assessment ledger. For each administration/data-type pair it captures:

- status: `complete`, `partial`, or `not_loaded`
- the date from which the archive is complete, where known
- fields present in the delivered extract
- fields explicitly missing
- record count and assessment note

The completeness view fills unassessed combinations with `not_loaded`; it does not infer that a source is complete. A blank or missing source value is kept blank, with an omission note where supplied.

## Consolidation and internal invoices

Internal sales invoices are marked at ingestion. Consolidation reports:

- gross revenue from sales records
- the precise internal-invoice total eliminated
- consolidated revenue after elimination
- an elimination list showing the invoice, source administration, counterparty administration, amount, and reason

This prevents internal turnover from being double-counted while preserving the original legal-administration record.

## NAS checksum verification boundary

The application stores only a **relative document reference** and its expected SHA-256 digest. The optional `NAS_READONLY_ROOT` environment value may point to a filesystem mount supplied by operations under a read-only NAS account.

At record view time:

1. FPS-Archief refuses absolute paths, URL-style values, traversal sequences, and references that resolve outside the configured root.
2. If the mount and a safe relative reference are available, the server reads the file, computes SHA-256, and reports `verified` or `mismatch`.
3. If no mount is configured or the file cannot be read, it reports `unavailable`; it never claims verification.
4. If a row has no reference/checksum, it reports `not_referenced`.

Credentials, NAS host names, and mounting commands are intentionally not stored in this project. Operations owns the read-only mount; FPS-Archief only consumes the mounted boundary.

## Initial loading boundary

Initial loading is designed for two source paths:

- **Connect extracts:** mapped into the archive envelope with `provenance = Connect`.
- **AccountView exports:** mapped from exported data with `provenance = AccountView`.

Manual imports remain possible only as append-only ingestion rows and must use `provenance = manual_import`. An import mapping must carry source values as delivered and add an explicit omission note when a required archive field is absent. There is no import or API path back to Connect.

## Demo data

The first working version includes a small set of rows marked `DEMO — not imported source data` with `provenance = manual_import`. They exist solely to demonstrate search, metrics, completeness, integrity status, corrections, and consolidations. They must be replaced by governed import rows before using results for audit evidence.

## Operational checks

- Review the completeness matrix before relying on a period or administration.
- Use the record-detail integrity result before treating a NAS document as verified.
- Use the consolidation view for group totals; do not add administration-level revenue totals manually.
- Use an append-only correction row, never a source edit.
- Exported data carries provenance, internal flags, document references, checksums, and omission notes alongside the selected records.