import { Link } from "wouter";
import { 
  useGetArchiveSummary, 
  getGetArchiveSummaryQueryKey,
  AdministrationParameter,
  type GetArchiveSummaryParams,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, AlertTriangle, CheckCircle2, DollarSign, FileText, Database, Shield, Layers } from "lucide-react";
import { useState } from "react";

const ADMINISTRATIONS = [
  "FPS Bouw", 
  "FPS Brandpreventie", 
  "FPS Onderhoud", 
  "FPS Bouw & Renovatie", 
  "Futur Holding"
] as const;

export default function Dashboard() {
  const [admin, setAdmin] = useState<string>("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const summaryParams: GetArchiveSummaryParams = {
    ...(admin !== "all" ? { administration: admin as AdministrationParameter } : {}),
    ...(periodFrom ? { periodFrom } : {}),
    ...(periodTo ? { periodTo } : {}),
  };

  const { data: summary, isLoading, error } = useGetArchiveSummary(
    summaryParams,
    { query: { queryKey: getGetArchiveSummaryQueryKey(summaryParams) } }
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Archive Dashboard</h1>
          <p className="text-muted-foreground mt-1">Immutable administrative overview and reconciliation metrics.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            aria-label="Period from"
            type="date"
            value={periodFrom}
            onChange={(event) => setPeriodFrom(event.target.value)}
            className="h-10 w-36 rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            aria-label="Period to"
            type="date"
            value={periodTo}
            onChange={(event) => setPeriodTo(event.target.value)}
            className="h-10 w-36 rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="w-56">
          <Select value={admin} onValueChange={setAdmin}>
            <SelectTrigger>
              <SelectValue placeholder="All Administrations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Administrations</SelectItem>
              {ADMINISTRATIONS.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 border-destructive bg-destructive/10 text-destructive rounded-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Failed to load archive metrics. The immutable store might be unavailable.</span>
        </div>
      ) : summary ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold font-mono tracking-tighter">
                  {formatCurrency(summary.revenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Total Purchases</div>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold font-mono tracking-tighter">
                  {formatCurrency(summary.purchases)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Immutable Records</div>
                  <Database className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold font-mono tracking-tighter">
                  {summary.recordCount.toLocaleString('nl-NL')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.internalInvoiceCount.toLocaleString('nl-NL')} internal
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Data Completeness</div>
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold font-mono tracking-tighter flex items-baseline gap-2">
                  {summary.completenessPercent}%
                  {summary.completenessPercent === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-accent" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Integrity Signals</CardTitle>
                <CardDescription>Per-record checksum verification through the configured read-only NAS boundary.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-sm bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-sm">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">NAS Verification</div>
                        <div className="text-xs text-muted-foreground">Run from each record when a read-only NAS mount is configured</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">On demand</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-sm bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Append-only Enforcement</div>
                        <div className="text-xs text-muted-foreground">Database triggers reject UPDATE and DELETE operations</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Intact</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common archival tasks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/records">
                    <div className="p-4 border rounded-sm hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors group">
                      <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2" />
                      <div className="font-medium text-sm">Search Records</div>
                      <div className="text-xs text-muted-foreground">Query cross-domain data</div>
                    </div>
                  </Link>
                  <Link href="/consolidation">
                    <div className="p-4 border rounded-sm hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors group">
                      <Layers className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2" />
                      <div className="font-medium text-sm">View Consolidation</div>
                      <div className="text-xs text-muted-foreground">Internal eliminations</div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
