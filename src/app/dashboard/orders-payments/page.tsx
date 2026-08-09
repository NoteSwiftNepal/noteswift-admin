'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Eye, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddOfflineSaleDialog } from "@/components/orders/AddOfflineSaleDialog";
import { CodeGeneratedDialog } from "@/components/orders/CodeGeneratedDialog";
import { CodeDialog } from "@/components/orders/CodeDialog";
import { BulkCodeGenerationDialog } from "@/components/orders/BulkCodeGenerationDialog";
import { EsewaTransactionDialog } from "@/components/orders/EsewaTransactionDialog";
import { exportCodesListToPDF } from "@/lib/pdf-utils";

export default function OrdersPaymentsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [codes, setCodes] = useState([]);
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [isCodeDetailOpen, setIsCodeDetailOpen] = useState(false);
  const [selectedCodeDetail, setSelectedCodeDetail] = useState<any>(null);
  const [courses, setCourses] = useState([]);
  const [adminMap, setAdminMap] = useState<Record<string, { email: string; role: string }>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'codes' | 'bulk-codes' | 'esewa'>('transactions');
  const [esewaTransactions, setEsewaTransactions] = useState<any[]>([]);
  const [esewaLoading, setEsewaLoading] = useState(false);
  const [selectedEsewaTransaction, setSelectedEsewaTransaction] = useState<any | null>(null);
  const [isEsewaDetailOpen, setIsEsewaDetailOpen] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // School-wise bulk code history — persisted server-side and fetched per
  // selected school on demand, unlike the old approach of only holding
  // this session's just-generated batches in local state (lost on reload).
  const [historySchools, setHistorySchools] = useState<{ _id: string; name: string; shortCode: string }[]>([]);
  const [selectedHistorySchoolId, setSelectedHistorySchoolId] = useState('');
  const [schoolCodes, setSchoolCodes] = useState<any[]>([]);
  const [schoolCodesLoading, setSchoolCodesLoading] = useState(false);
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<string>>(new Set());
  const [pdfExporting, setPdfExporting] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchTransactions();
    fetchCourses();
    fetchHistorySchools();
  }, []);

  useEffect(() => {
    setSelectedCodeIds(new Set());
    if (selectedHistorySchoolId) {
      fetchSchoolCodes(selectedHistorySchoolId);
    } else {
      setSchoolCodes([]);
    }
  }, [selectedHistorySchoolId]);

  const fetchHistorySchools = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.DROPDOWN, createFetchOptions('GET'));
      const data = await response.json();
      setHistorySchools(data.data?.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const fetchSchoolCodes = async (schoolId: string) => {
    try {
      setSchoolCodesLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      // listUnlockCodes caps each page at 100, and a single bulk-generation
      // batch can be up to 1000 codes — so "history" and "Export All" must
      // page through every result, not just the first 100.
      let page = 1;
      let allCodes: any[] = [];
      let totalPages = 1;
      do {
        const response = await fetch(
          `${API_ENDPOINTS.ORDERS_PAYMENTS.CODES.LIST}?schoolId=${schoolId}&limit=100&page=${page}&sortBy=createdAt&order=desc`,
          createFetchOptions('GET')
        );
        const data = await response.json();
        if (!data.success) break;
        allCodes = allCodes.concat(data.data);
        totalPages = data.pagination?.pages || 1;
        page++;
      } while (page <= totalPages);
      setSchoolCodes(allCodes);
    } catch (error) {
      console.error('Failed to fetch school codes:', error);
      toast({
        title: "Error",
        description: "Failed to load codes for this school",
        variant: "destructive",
      });
    } finally {
      setSchoolCodesLoading(false);
    }
  };

  const toggleSelectCode = (id: string) => {
    setSelectedCodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Only unused codes are ever exportable, so "select all" only selects those
  // — selecting a used code would just be silently dropped at export time.
  const toggleSelectAll = () => {
    const unusedIds = schoolCodes.filter((c: any) => !c.isUsed).map((c: any) => c._id);
    setSelectedCodeIds(prev =>
      prev.size === unusedIds.length ? new Set() : new Set(unusedIds)
    );
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        `${API_ENDPOINTS.ORDERS_PAYMENTS.TRANSACTIONS.LIST}?limit=50&status=pending-code-redemption`,
        createFetchOptions('GET')
      );
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
        if (data.courseMap) {
          setCourseMap(prev => ({ ...prev, ...data.courseMap }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Deliberately no status filter (unlike fetchTransactions above, which
  // hardcodes status=pending-code-redemption for the manual-code flow) —
  // this tab needs to show pending-gateway/completed/failed alike.
  const fetchEsewaTransactions = async () => {
    if (esewaTransactions.length > 0) return;
    try {
      setEsewaLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        `${API_ENDPOINTS.ORDERS_PAYMENTS.TRANSACTIONS.LIST}?limit=50&paymentMethod=esewa-gateway`,
        createFetchOptions('GET')
      );
      const data = await response.json();
      if (data.success) {
        setEsewaTransactions(data.data);
        if (data.courseMap) {
          setCourseMap(prev => ({ ...prev, ...data.courseMap }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch eSewa transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load eSewa transactions",
        variant: "destructive",
      });
    } finally {
      setEsewaLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (courses.length > 0) return;

    try {
      setCoursesLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.COURSES.DROPDOWN, createFetchOptions('GET'));
      const data = await response.json();
      if (data.success) {
        setCourses(data.data);
        const map: Record<string, string> = {};
        data.data.forEach((course: any) => {
          map[course._id] = course.title;
        });
        setCourseMap(prev => ({ ...prev, ...map }));
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setCoursesLoading(false);
    }
  };

  // Shared by both the plain tab-open load and an active search — a search
  // must query the whole collection server-side (not just filter whatever's
  // already loaded), so a match can surface a code outside the normal
  // latest-50 window.
  const runCodesQuery = async (search?: string) => {
    try {
      setCodesLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const params = new URLSearchParams({ limit: '50', sortBy: 'createdAt', order: 'desc' });
      if (search) params.set('search', search);
      const response = await fetch(
        `${API_ENDPOINTS.ORDERS_PAYMENTS.CODES.LIST}?${params.toString()}`,
        createFetchOptions('GET')
      );
      const data = await response.json();
      if (data.success) {
        setCodes(data.data);
        if (data.courseMap) {
          setCourseMap(prev => ({ ...prev, ...data.courseMap }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error);
      toast({
        title: "Error",
        description: "Failed to load unlock codes",
        variant: "destructive",
      });
    } finally {
      setCodesLoading(false);
    }
  };

  const fetchCodes = async () => {
    if (codes.length > 0) return;
    await runCodesQuery();
  };

  const searchCodes = async (query: string) => {
    await runCodesQuery(query.trim() || undefined);
  };

  const fetchAdmins = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.LIST, createFetchOptions('GET'));
      const data = await response.json();
      if (data.success) {
        const map: Record<string, { email: string; role: string }> = {};
        data.admins.forEach((admin: any) => {
          map[admin._id] = { email: admin.email, role: admin.role };
        });
        setAdminMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const formatIssuerInfo = (issuedByAdminId: string, issuedByRole: string) => {
    const admin = adminMap[issuedByAdminId];
    if (admin) {
      return `${admin.role} (${admin.email})`;
    }
    return `${issuedByRole} (${issuedByAdminId})`;
  };

  const handleSubmitBulkCodes = async (formData: any) => {
    setLoading(true);
    try {
      const submitData = {
        organizationName: formData.organizationName,
        courseId: formData.course,
        numberOfCodes: parseInt(formData.numberOfCodes),
        paymentMethod: formData.paymentMethod,
        amount: formData.amount,
        notes: formData.notes,
        schoolId: formData.schoolId,
      };

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ORDERS_PAYMENTS.CODES.BULK_CREATE,
        createFetchOptions('POST', submitData)
      );
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Generated ${formData.numberOfCodes} codes for ${formData.organizationName}`,
        });
        setIsBulkDialogOpen(false);
        fetchCodes(); // refresh the codes list
        // If generated for a school, jump the history view to that school so
        // the new codes are immediately visible in the persisted list.
        if (formData.schoolId) {
          setSelectedHistorySchoolId(formData.schoolId);
          fetchSchoolCodes(formData.schoolId);
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate bulk codes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate bulk codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async (formData: any) => {
    setLoading(true);
    try {
      let paymentReference = formData.paymentReference;

      // Handle screenshot upload
      if (formData.paymentReferenceType === 'screenshot' && formData.paymentScreenshot) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.paymentScreenshot!);
        });
        paymentReference = base64;
      }

      const submitData = {
        buyerName: formData.buyerName,
        contact: formData.contact,
        paymentReferenceType: formData.paymentReferenceType,
        paymentReference,
        paymentMethod: formData.paymentMethod,
        courseId: formData.course,
        amount: formData.amount,
        notes: formData.notes,
      };

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ORDERS_PAYMENTS.TRANSACTIONS.CREATE,
        createFetchOptions('POST', submitData)
      );
      const data = await response.json();

      if (data.success) {
        const unlockCode = data.data.unlockCode.code;
        setGeneratedCode(unlockCode);
        setIsCodeDialogOpen(true);
        toast({
          title: "Success",
          description: `Transaction created! Unlock code: ${unlockCode}`,
        });
        setIsAddDialogOpen(false);
        fetchTransactions();
        fetchCodes();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
   <div>
           <div className="flex items-center gap-2">
                      <Receipt className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Orders & Payments</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Manage and track orders and payments for courses</p>
        </div>        <div className="flex gap-2">
          <AddOfflineSaleDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            courses={courses}
            coursesLoading={coursesLoading}
            onSubmit={handleSubmitTransaction}
            loading={loading}
          />
          <BulkCodeGenerationDialog
            open={isBulkDialogOpen}
            onOpenChange={setIsBulkDialogOpen}
            courses={courses}
            coursesLoading={coursesLoading}
            onSubmit={handleSubmitBulkCodes}
            loading={loading}
          />
        </div>
        <CodeGeneratedDialog
          open={isCodeDialogOpen}
          onOpenChange={setIsCodeDialogOpen}
          code={generatedCode}
        />
        <CodeDialog
          open={isCodeDetailOpen}
          onOpenChange={setIsCodeDetailOpen}
          code={selectedCodeDetail}
          loading={false}
          courseMap={courseMap}
          formatIssuerInfo={formatIssuerInfo}
        />
      </div>

      <div className="grid gap-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => {
              setActiveTab('codes');
              fetchCodes();
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'codes'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unlock Codes
          </button>
          <button
            onClick={() => setActiveTab('bulk-codes')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'bulk-codes'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bulk Codes
          </button>
          <button
            onClick={() => {
              setActiveTab('esewa');
              fetchEsewaTransactions();
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'esewa'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            eSewa Payments
          </button>
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Transactions</CardTitle>
              <CardDescription>Transactions awaiting code redemption</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          Loading transactions...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction: any) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          <div className="font-medium">{transaction.buyerName}</div>
                          <div className="text-sm text-muted-foreground">{transaction.contact}</div>
                        </TableCell>
                        <TableCell>
                          {courseMap[transaction.courseId]
                            ? `${courseMap[transaction.courseId]} (${transaction.courseId})`
                            : transaction.courseId}
                        </TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>Rs. {transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{transaction.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Codes Tab */}
        {activeTab === 'codes' && (
          <Card>
            <CardHeader>
              <CardTitle>Unlock Codes</CardTitle>
              <CardDescription>Generated unlock codes and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Input
                  placeholder="Search by code, course, school, issued to, issued by, status, used by..."
                  className="max-w-sm"
                  value={codeSearchQuery}
                  onChange={(e) => setCodeSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchCodes(codeSearchQuery); }}
                />
                <Button variant="outline" size="sm" onClick={() => searchCodes(codeSearchQuery)}>
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
                    <TableHead>School</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          Loading codes...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No unlock codes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    codes.map((code: any) => {
                      const courseLabel = courseMap[code.courseId]
                        ? `${courseMap[code.courseId]} (${code.courseId})`
                        : code.courseId;
                      const issuerLabel = code.issuedByAdminId && code.issuedByRole
                        ? formatIssuerInfo(code.issuedByAdminId, code.issuedByRole)
                        : 'Unknown';
                      const usedByLabel = code.usedByStudent
                        ? (code.usedByStudent.email
                            ? `${code.usedByStudent.full_name} (${code.usedByStudent.email})`
                            : code.usedByStudent.full_name)
                        : null;
                      return (
                        <TableRow key={code._id}>
                          <TableCell className="font-mono font-bold text-blue-600">
                            {code.code || '***'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[220px] truncate" title={courseLabel}>{courseLabel}</div>
                          </TableCell>
                          <TableCell>
                            {code.schoolId?.shortCode ? (
                              <Badge variant="outline" className="font-mono">{code.schoolId.shortCode}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[140px] truncate" title={code.issuedTo}>{code.issuedTo}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate" title={issuerLabel}>{issuerLabel}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.isUsed ? "secondary" : "default"}>
                              {code.isUsed ? "Used" : "Unused"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {usedByLabel ? (
                              <div className="max-w-[180px] truncate" title={usedByLabel}>{usedByLabel}</div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCodeDetail(code);
                                setIsCodeDetailOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Bulk Codes Tab */}
        {activeTab === 'bulk-codes' && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Codes — School History</CardTitle>
              <CardDescription>
                School-linked bulk codes, kept here permanently (separate from the Unlock Codes tab's normal codes).
                Each code is one-time-use; both used and unused codes stay listed here indefinitely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-64">
                  <Select value={selectedHistorySchoolId} onValueChange={setSelectedHistorySchoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school to view its codes" />
                    </SelectTrigger>
                    <SelectContent>
                      {historySchools.map((school) => (
                        <SelectItem key={school._id} value={school._id}>
                          {school.name} ({school.shortCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {schoolCodes.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedCodeIds.size === 0 || pdfExporting}
                      onClick={async () => {
                        setPdfExporting(true);
                        try {
                          const exportedCount = await exportCodesListToPDF(
                            schoolCodes.filter((c: any) => selectedCodeIds.has(c._id)),
                            historySchools.find(s => s._id === selectedHistorySchoolId)?.name || 'School',
                            courseMap
                          );
                          if (exportedCount === 0) {
                            toast({
                              title: "Nothing to export",
                              description: "All selected codes have already been used.",
                              variant: "destructive",
                            });
                          }
                        } finally {
                          setPdfExporting(false);
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {pdfExporting ? 'Exporting...' : `Export Selected (${selectedCodeIds.size})`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pdfExporting}
                      onClick={async () => {
                        setPdfExporting(true);
                        try {
                          const exportedCount = await exportCodesListToPDF(
                            schoolCodes,
                            historySchools.find(s => s._id === selectedHistorySchoolId)?.name || 'School',
                            courseMap
                          );
                          if (exportedCount === 0) {
                            toast({
                              title: "Nothing to export",
                              description: "All codes for this school have already been used.",
                              variant: "destructive",
                            });
                          }
                        } finally {
                          setPdfExporting(false);
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {pdfExporting ? 'Exporting...' : 'Export All'}
                    </Button>
                  </>
                )}
              </div>

              {!selectedHistorySchoolId ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a school above to see its bulk code history
                </div>
              ) : schoolCodesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  Loading codes...
                </div>
              ) : schoolCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bulk codes generated for this school yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedCodeIds.size > 0 &&
                            selectedCodeIds.size === schoolCodes.filter((c: any) => !c.isUsed).length
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Used On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolCodes.map((code: any) => (
                      <TableRow key={code._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCodeIds.has(code._id)}
                            disabled={code.isUsed}
                            onCheckedChange={() => toggleSelectCode(code._id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold text-blue-600">
                          {code.code || '***'}
                        </TableCell>
                        <TableCell>
                          {courseMap[code.courseId] || code.courseId}
                        </TableCell>
                        <TableCell>
                          {code.createdAt ? new Date(code.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.isUsed ? "secondary" : "default"}>
                            {code.isUsed ? "Used" : "Unused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {code.usedByStudent
                            ? (code.usedByStudent.email
                                ? `${code.usedByStudent.full_name} (${code.usedByStudent.email})`
                                : code.usedByStudent.full_name)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {code.usedTimestamp ? new Date(code.usedTimestamp).toLocaleString() : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* eSewa Payments Tab */}
        {activeTab === 'esewa' && (
          <Card>
            <CardHeader>
              <CardTitle>eSewa Payments</CardTitle>
              <CardDescription>Automated in-app eSewa gateway transactions (direct pay-to-enroll)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway Status</TableHead>
                    <TableHead>Transaction UUID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {esewaLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          Loading eSewa transactions...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : esewaTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No eSewa transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    esewaTransactions.map((transaction: any) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          <div className="font-medium">{transaction.buyerName}</div>
                          <div className="text-sm text-muted-foreground">{transaction.contact}</div>
                        </TableCell>
                        <TableCell>
                          {courseMap[transaction.courseId]
                            ? `${courseMap[transaction.courseId]} (${transaction.courseId})`
                            : transaction.courseId}
                        </TableCell>
                        <TableCell>Rs. {transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'failed' || transaction.status === 'cancelled' ? 'destructive' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.gatewayStatus ? (
                            <Badge variant={
                              transaction.gatewayStatus === 'COMPLETE' ? 'default'
                                : (transaction.gatewayStatus === 'PENDING' || transaction.gatewayStatus === 'AMBIGUOUS') ? 'secondary'
                                : 'destructive'
                            }>
                              {transaction.gatewayStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs" title={transaction.transactionUuid}>
                            {transaction.transactionUuid ? `${transaction.transactionUuid.slice(0, 8)}…` : '—'}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEsewaTransaction(transaction);
                              setIsEsewaDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <EsewaTransactionDialog
          open={isEsewaDetailOpen}
          onOpenChange={setIsEsewaDetailOpen}
          transaction={selectedEsewaTransaction}
          courseMap={courseMap}
        />
      </div>
    </div>
  );
}