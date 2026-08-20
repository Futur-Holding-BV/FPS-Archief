import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetArchiveRecord, 
  getGetArchiveRecordQueryKey,
  useVerifyArchiveDocument,
  getVerifyArchiveDocumentQueryKey,
  useAddArchiveCorrection
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input, Textarea, Label } from "@/components/ui/core";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime, formatDate } from "@/lib/utils";
import { ArrowLeft, ShieldCheck, ShieldAlert, FileText, Database, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function RecordDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();

  const { data: record, isLoading } = useGetArchiveRecord(id, {
    query: { enabled: !!id, queryKey: getGetArchiveRecordQueryKey(id) }
  });

  const { data: integrity, isLoading: isIntegrityLoading, refetch: refetchIntegrity } = useVerifyArchiveDocument(id, {
    query: { enabled: !!id, queryKey: getVerifyArchiveDocumentQueryKey(id) }
  });

  const addCorrection = useAddArchiveCorrection({
    mutation: {
      onSuccess: () => {
        setCorrectionOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetArchiveRecordQueryKey(id) });
      }
    }
  });

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [notes, setNotes] = useState("");

  if (isLoading) return <Layout><div className="p-8">Loading record...</div></Layout>;
  if (!record) return <Layout><div className="p-8">Record not found.</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/records">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Records
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="uppercase tracking-wider">{record.dataType.replace('_', ' ')}</Badge>
              {record.isInternal && <Badge variant="secondary">INTERNAL</Badge>}
              {record.correctionOfId && <Badge variant="destructive" className="bg-accent text-white">CORRECTION</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              RECORD #{record.id.toString().padStart(6, '0')}
            </h1>
          </div>
          
          <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Append Correction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Append Correction Record</DialogTitle>
                <DialogDescription>
                  This will create a new immutable record linked to #{record.id}. The original record cannot be modified or deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Omission Notes / Reason for Correction</Label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe why this correction is necessary..."
                    className="h-24"
                  />
                </div>
                <div className="bg-muted p-3 text-xs font-mono rounded-sm border">
                  New record will inherit: <br/>
                  Admin: {record.administration} <br/>
                  Period: {record.periodDate} <br/>
                  Type: {record.dataType}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCorrectionOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => addCorrection.mutate({ 
                    id, 
                    data: {
                      dataType: record.dataType,
                      administration: record.administration,
                      periodDate: record.periodDate,
                      provenance: "manual_import",
                      payload: record.payload,
                      omissionNotes: notes,
                      documentReference: record.documentReference,
                      storedChecksum: record.storedChecksum,
                      isInternal: record.isInternal
                    }
                  })}
                  disabled={!notes || addCorrection.isPending}
                >
                  {addCorrection.isPending ? "Appending..." : "Append Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" /> Payload Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-muted/30 p-6 font-mono text-sm overflow-x-auto">
                <pre>{JSON.stringify(record.payload, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>

          {record.omissionNotes && (
            <Card className="border-accent">
              <CardHeader className="bg-accent/5 border-b border-accent/20 pb-4">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-accent flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Correction Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 text-sm">
                {record.omissionNotes}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Administration</div>
                <div className="font-medium text-sm">{record.administration}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Period</div>
                <div className="font-mono text-sm">{formatDate(record.periodDate)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Ingested At</div>
                <div className="font-mono text-sm">{formatDateTime(record.ingestedAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Archived At</div>
                <div className="font-mono text-sm">{formatDateTime(record.archivedAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Provenance</div>
                <div className="font-mono text-sm px-2 py-1 bg-muted rounded-sm inline-block">{record.provenance}</div>
              </div>
              {record.correctionOfId && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Corrects Record</div>
                  <Link href={`/records/${record.correctionOfId}`}>
                    <div className="font-mono text-sm text-primary hover:underline cursor-pointer">
                      #{record.correctionOfId.toString().padStart(6, '0')}
                    </div>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> Document Integrity
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetchIntegrity()} disabled={isIntegrityLoading}>
                <RefreshCw className={`w-4 h-4 ${isIntegrityLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t">
              {record.documentReference ? (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reference</div>
                    <div className="font-mono text-xs break-all bg-muted p-2 rounded-sm">{record.documentReference}</div>
                  </div>
                  
                  {isIntegrityLoading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Verifying checksum...</div>
                  ) : integrity ? (
                    <div className={`p-4 rounded-sm border ${integrity.status === 'verified' ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/10 border-destructive/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {integrity.status === 'verified' ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-5 h-5 text-destructive" />
                        )}
                        <span className={`font-semibold text-sm ${integrity.status === 'verified' ? 'text-emerald-700' : 'text-destructive'}`}>
                          {integrity.message}
                        </span>
                      </div>
                      <div className="space-y-2 mt-3 text-xs font-mono">
                        <div>
                          <div className="text-muted-foreground">Stored Checksum:</div>
                          <div className="truncate" title={integrity.storedChecksum || ''}>{integrity.storedChecksum || 'N/A'}</div>
                        </div>
                        {integrity.actualChecksum && (
                          <div>
                            <div className="text-muted-foreground">NAS Checksum:</div>
                            <div className="truncate" title={integrity.actualChecksum}>{integrity.actualChecksum}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Integrity check failed.</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground italic">No document reference attached.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
