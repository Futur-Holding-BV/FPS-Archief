import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/core";
import { ShieldCheck, HardDrive, Lock, FileKey } from "lucide-react";

export default function Architecture() {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Architecture & Assurances</h1>
        <p className="text-muted-foreground mt-1">Documentation of immutability guarantees and system boundaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lock className="w-5 h-5" /> Immutability Guarantee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              FPS-Archief operates on a strict Append-Only architectural pattern. Once a payload is ingested into the database, it cannot be modified or deleted. 
            </p>
            <p>
              If a correction is required (e.g. retroactive journal adjustments), a new corrective record must be appended that references the original record ID. Both records remain visible in the audit trail, ensuring complete transparency for retrospective questions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HardDrive className="w-5 h-5" /> NAS Checksum Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              FPS-Archief stores only a relative document reference and SHA-256 checksum. Document bytes stay outside the archive on an operations-managed NAS.
            </p>
            <p>
              When operations supplies a read-only NAS mount, opening a record calculates SHA-256 for the referenced relative file and visibly reports verified, mismatch, unavailable, or not referenced. No NAS credentials or file bytes live in FPS-Archief.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" /> Source Boundary Separation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every source row has exactly one required administration from the closed five-administration list: FPS Bouw, FPS Brandpreventie, FPS Onderhoud, FPS Bouw & Renovatie, or Futur Holding.
            </p>
            <p>
              Consolidation is a read-only calculation over those separate rows. Internal invoices remain visible as legal-administration records and are explicitly eliminated from the group revenue figure; there is no source-system write-back path.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileKey className="w-5 h-5" /> Retrospective API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              All archive queries support administration and period filtering, and each row carries its provenance, ingestion timestamp, document reference, checksum, omission notes, and correction link. This allows an auditor to understand both the source and the archive's stated coverage for each result.
            </p>
            <p>
              Export follows the selected filters and preserves that audit context rather than presenting transformed source data as a new accounting ledger.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
