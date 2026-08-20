import { useState } from "react";
import { Link } from "wouter";
import { 
  useGetConsolidation, 
  getGetConsolidationQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui/core";
import { formatCurrency } from "@/lib/utils";
import { Layers, ArrowRightLeft, DollarSign } from "lucide-react";

export default function Consolidation() {
  const { data: consolidation, isLoading } = useGetConsolidation(
    {},
    { query: { queryKey: getGetConsolidationQueryKey() } }
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Consolidation</h1>
        <p className="text-muted-foreground mt-1">Cross-entity elimination of internal invoices for group reporting.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Calculating consolidations...</div>
      ) : consolidation ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Gross Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{formatCurrency(consolidation.grossRevenue)}</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4"/> Internal Eliminations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-primary">
                  -{formatCurrency(consolidation.internalEliminations)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-md border-primary border-t-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4"/> Consolidated Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono tracking-tighter">
                  {formatCurrency(consolidation.consolidatedRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Elimination Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {consolidation.eliminations && consolidation.eliminations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Invoice Ref</TableHead>
                      <TableHead>From Entity</TableHead>
                      <TableHead>To Entity</TableHead>
                      <TableHead className="text-right">Amount Eliminated</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidation.eliminations.map((elim) => (
                      <TableRow key={elim.recordId}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <Link href={`/records/${elim.recordId}`} className="hover:text-primary hover:underline">
                            #{elim.recordId.toString().padStart(6, '0')}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{elim.invoiceNumber}</TableCell>
                        <TableCell className="font-medium text-sm">{elim.fromAdministration}</TableCell>
                        <TableCell className="font-medium text-sm">{elim.toAdministration}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-primary">
                          -{formatCurrency(elim.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                            {elim.reason}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-sm">
                  No internal eliminations found for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Layout>
  );
}
