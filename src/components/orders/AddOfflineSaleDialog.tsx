import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";

interface Course {
  _id: string;
  title: string;
}

interface AddOfflineSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  coursesLoading: boolean;
  onSubmit: (formData: any) => Promise<void>;
  loading: boolean;
}

export function AddOfflineSaleDialog({
  open,
  onOpenChange,
  courses,
  coursesLoading,
  onSubmit,
  loading
}: AddOfflineSaleDialogProps) {
  const [formData, setFormData] = useState({
    buyerName: "",
    contact: "",
    paymentReferenceType: "transaction-id",
    paymentReference: "",
    paymentScreenshot: null as File | null,
    paymentMethod: "",
    course: "",
    amount: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    // Reset form
    setFormData({
      buyerName: "",
      contact: "",
      paymentReferenceType: "transaction-id",
      paymentReference: "",
      paymentScreenshot: null,
      paymentMethod: "",
      course: "",
      amount: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Offline Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Offline Sale</DialogTitle>
          <DialogDescription>
            Record a manual payment and generate an unlock code for the buyer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyerName">Buyer Name</Label>
              <Input
                id="buyerName"
                value={formData.buyerName}
                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact">Contact (Phone/WhatsApp)</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label>Payment Reference</Label>
            <RadioGroup
              value={formData.paymentReferenceType}
              onValueChange={(value) => setFormData({ ...formData, paymentReferenceType: value })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transaction-id" id="transaction-id" />
                <Label htmlFor="transaction-id">Transaction ID</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="screenshot" id="screenshot" />
                <Label htmlFor="screenshot">Upload Screenshot</Label>
              </div>
            </RadioGroup>
            {formData.paymentReferenceType === 'transaction-id' ? (
              <Input
                className="mt-2"
                placeholder="Enter transaction ID"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
              />
            ) : (
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData({ ...formData, paymentScreenshot: file });
                  }}
                  className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.paymentScreenshot && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {formData.paymentScreenshot.name}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                <SelectTrigger>
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
          </div>
          
          <div>
            <Label htmlFor="amount">Amount Paid</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the payment"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Confirm & Generate Code"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
