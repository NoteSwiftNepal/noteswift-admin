import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Course {
  _id: string;
  title: string;
}

export interface AssignCourseFormData {
  course: string;
  paymentMethod: string;
  amount: string;
  paymentReference: string;
  notes: string;
}

interface AssignCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  courses: Course[];
  coursesLoading: boolean;
  onSubmit: (formData: AssignCourseFormData) => Promise<void>;
  loading: boolean;
}

const EMPTY_FORM: AssignCourseFormData = {
  course: "",
  paymentMethod: "",
  amount: "",
  paymentReference: "",
  notes: "",
};

export function AssignCourseDialog({
  open,
  onOpenChange,
  studentName,
  courses,
  coursesLoading,
  onSubmit,
  loading,
}: AssignCourseDialogProps) {
  const [formData, setFormData] = useState<AssignCourseFormData>(EMPTY_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Course to {studentName}</DialogTitle>
          <DialogDescription>
            Directly enroll this student in a course — no unlock code needed. Record how they paid, same as a manual sale.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assign-course">Course</Label>
            <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })}>
              <SelectTrigger id="assign-course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {coursesLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading courses...</div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assign-payment-method">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger id="assign-payment-method">
                  <SelectValue placeholder="Select method" />
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
              <Label htmlFor="assign-amount">Amount Paid</Label>
              <Input
                id="assign-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assign-reference">Transaction ID / Reference (optional)</Label>
            <Input
              id="assign-reference"
              placeholder="e.g. eSewa transaction ID"
              value={formData.paymentReference}
              onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="assign-notes">Notes (optional)</Label>
            <Textarea
              id="assign-notes"
              placeholder="Additional notes about this assignment"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.course || !formData.paymentMethod || !formData.amount}>
              {loading ? "Assigning..." : "Assign Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
