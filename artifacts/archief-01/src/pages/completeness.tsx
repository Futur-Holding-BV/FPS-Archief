import { useState } from "react";
import { 
  useGetArchiveCompleteness, 
  getGetArchiveCompletenessQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui/core";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export default function Completeness() {
  const { data: completeness, isLoading } = useGetArchiveCompleteness(
    {},
    { query: { queryKey: getGetArchiveCompletenessQueryKey() } }
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Completeness</h1>
        <p className="text-muted-foreground mt-1">Verify ingestion coverage across domains and entities.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Analyzing completeness...</div>
          ) : completeness ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administration</TableHead>
                  <TableHead>Data Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Complete From</TableHead>
                  <TableHead className="text-right">Record Count</TableHead>
                  <TableHead>Gaps / Missing Fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completeness.map((c, i) => (
                  <TableRow key={`${c.administration}-${c.dataType}-${i}`}>
                    <TableCell className="font-medium text-sm">{c.administration}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.dataType.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === 'complete' ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Complete
                        </div>
                      ) : c.status === 'partial' ? (
                        <div className="flex items-center gap-2 text-accent font-medium text-sm">
                          <AlertCircle className="w-4 h-4" /> Partial
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                          <XCircle className="w-4 h-4" /> Not Loaded
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.completeFrom ? formatDate(c.completeFrom) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {c.recordCount.toLocaleString('nl-NL')}
                    </TableCell>
                    <TableCell>
                      {c.missingFields && c.missingFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.missingFields.map(f => (
                            <Badge key={f} variant="secondary" className="text-[10px] py-0 bg-destructive/10 text-destructive border-transparent">Missing: {f}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None detected</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </Layout>
  );
}
