import { useState } from "react";
import { Link } from "wouter";
import { 
  useListArchiveRecords, 
  getListArchiveRecordsQueryKey,
  ListArchiveRecordsDataType,
  AdministrationParameter
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/core";
import { Input } from "@/components/ui/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui/core";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Filter, FileText, ChevronRight, FileDown } from "lucide-react";
import { useDebounce } from "@/lib/use-debounce";

const ADMINISTRATIONS = [
  "FPS Bouw", 
  "FPS Brandpreventie", 
  "FPS Onderhoud", 
  "FPS Bouw & Renovatie", 
  "Futur Holding"
];

const DATA_TYPES = [
  "sales_invoice",
  "purchase_invoice",
  "bank_transaction",
  "timesheet",
  "payroll_journal"
];

export default function Records() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [admin, setAdmin] = useState<string>("all");
  const [dataType, setDataType] = useState<string>("all");

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(admin !== "all" ? { administration: admin as AdministrationParameter } : {}),
    ...(dataType !== "all" ? { dataType: dataType as ListArchiveRecordsDataType } : {}),
    limit: 50
  };

  const { data: records, isLoading } = useListArchiveRecords(
    queryParams,
    { query: { queryKey: getListArchiveRecordsQueryKey(queryParams) } }
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Archive Records</h1>
        <p className="text-muted-foreground mt-1">Cross-domain search across all immutable records.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search payload, references, or IDs..." 
            className="pl-9 font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={admin} onValueChange={setAdmin}>
            <SelectTrigger>
              <SelectValue placeholder="Administration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Administrations</SelectItem>
              {ADMINISTRATIONS.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger>
              <SelectValue placeholder="Data Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DATA_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading records...</div>
        ) : records?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No records found matching your criteria.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Administration</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Provenance</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.map((record) => (
                <TableRow key={record.id} className="group cursor-pointer">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{record.id.toString().padStart(6, '0')}
                    {record.correctionOfId && (
                      <span className="ml-1 text-accent" title={`Corrects #${record.correctionOfId}`}>*</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {record.dataType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {record.administration}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {formatDate(record.periodDate)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-muted rounded-sm font-mono">
                      {record.provenance}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[150px]">
                    {record.documentReference || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/records/${record.id}`}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Layout>
  );
}
