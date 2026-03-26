import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, Download } from "lucide-react";

interface Code {
  _id: string;
  code: string;
  courseId: string;
  issuedTo: string;
  issuedByAdminId?: string;
  issuedByRole?: string;
  isUsed: boolean;
  expiresOn?: string;
  createdAt: string;
}

interface CodesTableProps {
  codes: Code[];
  loading: boolean;
  courseMap: Record<string, string>;
  adminMap: Record<string, { email: string; role: string }>;
  onViewCode: (code: Code) => void;
  formatIssuerInfo: (issuedByAdminId: string, issuedByRole: string) => string;
}

export function CodesTable({ codes, loading, courseMap, adminMap, onViewCode, formatIssuerInfo }: CodesTableProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="Search codes..." className="max-w-sm" />
        <Button variant="outline" size="sm">
          <Search className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" />
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Issued To</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  Loading codes...
                </div>
              </TableCell>
            </TableRow>
          ) : codes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No unlock codes found
              </TableCell>
            </TableRow>
          ) : (
            codes.map((code) => (
              <TableRow key={code._id}>
                <TableCell className="font-mono font-bold text-blue-600">
                  {code.code || '***'}
                </TableCell>
                <TableCell>
                  {courseMap[code.courseId] 
                    ? `${courseMap[code.courseId]} (${code.courseId})` 
                    : code.courseId}
                </TableCell>
                <TableCell>{code.issuedTo}</TableCell>
                <TableCell>
                  {code.issuedByAdminId && code.issuedByRole 
                    ? formatIssuerInfo(code.issuedByAdminId, code.issuedByRole) 
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge variant={code.isUsed ? "secondary" : "default"}>
                    {code.isUsed ? "Used" : "Unused"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {code.expiresOn ? new Date(code.expiresOn).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onViewCode(code)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
