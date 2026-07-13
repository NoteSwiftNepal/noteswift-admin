import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Course {
  _id: string;
  title: string;
}

interface SchoolOption {
  _id: string;
  name: string;
  shortCode: string;
}

const NO_SCHOOL = "none";

interface BulkCodeGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  coursesLoading: boolean;
  onSubmit: (formData: any) => Promise<void>;
  loading: boolean;
}

export function BulkCodeGenerationDialog({
  open,
  onOpenChange,
  courses,
  coursesLoading,
  onSubmit,
  loading
}: BulkCodeGenerationDialogProps) {
  const [formData, setFormData] = useState({
    organizationName: "",
    course: "",
    numberOfCodes: "",
    paymentMethod: "",
    amount: "",
    notes: "",
    school: NO_SCHOOL,
  });
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setSchoolsLoading(true);
      try {
        const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
        const response = await fetch(API_ENDPOINTS.SCHOOLS.DROPDOWN, createFetchOptions('GET'));
        const data = await response.json();
        setSchools(data.data?.schools || []);
      } catch (error) {
        console.error('Error fetching schools:', error);
      } finally {
        setSchoolsLoading(false);
      }
    })();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      schoolId: formData.school !== NO_SCHOOL ? formData.school : undefined,
    });
    // Reset form
    setFormData({
      organizationName: "",
      course: "",
      numberOfCodes: "",
      paymentMethod: "",
      amount: "",
      notes: "",
      school: NO_SCHOOL,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Bulk Generate Codes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Code Generation</DialogTitle>
          <DialogDescription>
            Generate multiple unlock codes for an organization or bulk purchase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input
              id="organizationName"
              placeholder="e.g., ABC School, XYZ Institute"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="course">Course</Label>
            <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {coursesLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading courses...
                  </div>
                ) : (
                  courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="school">School (optional)</Label>
            <Select value={formData.school} onValueChange={(value) => setFormData({ ...formData, school: value })}>
              <SelectTrigger>
                <SelectValue placeholder="No school (global code)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SCHOOL}>No school (global code)</SelectItem>
                {schoolsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading schools...
                  </div>
                ) : (
                  schools.map((school) => (
                    <SelectItem key={school._id} value={school._id}>
                      {school.name} ({school.shortCode})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {formData.school !== NO_SCHOOL
                ? "Generated codes will be prefixed with this school's short code and will link redeeming students to it."
                : "Codes will be generated without a school prefix and won't link students to any school."}
            </p>
          </div>

          <div>
            <Label htmlFor="numberOfCodes">Number of Codes</Label>
            <Input
              id="numberOfCodes"
              type="number"
              min="1"
              max="1000"
              placeholder="Enter number of codes to generate"
              value={formData.numberOfCodes}
              onChange={(e) => setFormData({ ...formData, numberOfCodes: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="esewa-personal">eSewa Personal</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Total Amount Paid</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter total amount paid"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the bulk generation"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Codes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}