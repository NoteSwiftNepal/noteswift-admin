import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface School {
  _id: string;
  name: string;
  shortCode: string;
}

interface ManageSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentSchoolId: string | null;
  currentSchoolName: string | null;
  schools: School[];
  schoolsLoading: boolean;
  onAssign: (schoolId: string) => Promise<void>;
  assignLoading: boolean;
  onMakeIndependent: () => Promise<void>;
  independentLoading: boolean;
}

export function ManageSchoolDialog({
  open,
  onOpenChange,
  studentName,
  currentSchoolId,
  currentSchoolName,
  schools,
  schoolsLoading,
  onAssign,
  assignLoading,
  onMakeIndependent,
  independentLoading,
}: ManageSchoolDialogProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [confirmIndependentOpen, setConfirmIndependentOpen] = useState(false);

  const isLocked = !!currentSchoolId;
  const isReassign = isLocked && selectedSchoolId && selectedSchoolId !== currentSchoolId;

  const handleAssign = async () => {
    if (!selectedSchoolId) return;
    await onAssign(selectedSchoolId);
    setSelectedSchoolId("");
  };

  const handleConfirmIndependent = async () => {
    setConfirmIndependentOpen(false);
    await onMakeIndependent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage School — {studentName}</DialogTitle>
          <DialogDescription>
            Lock this student to a school, move them to a different school, or make them independent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <span className="text-sm font-medium">Current School</span>
            {isLocked ? (
              <Badge variant="default">{currentSchoolName || "Linked school"}</Badge>
            ) : (
              <Badge variant="outline">Independent</Badge>
            )}
          </div>

          <div>
            <Label htmlFor="manage-school-select">
              {isLocked ? "Reassign to a different school" : "Lock to a school"}
            </Label>
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger id="manage-school-select">
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                {schoolsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading schools...</div>
                ) : (
                  schools
                    .filter((s) => s._id !== currentSchoolId)
                    .map((school) => (
                      <SelectItem key={school._id} value={school._id}>
                        {school.name} ({school.shortCode})
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {isReassign && (
              <p className="text-xs text-muted-foreground mt-2">
                This revokes any courses the student gained through their current school before linking them to the new one.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            {isLocked ? (
              <AlertDialog open={confirmIndependentOpen} onOpenChange={setConfirmIndependentOpen}>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmIndependentOpen(true)}
                  disabled={independentLoading}
                >
                  {independentLoading ? "Removing..." : "Make Independent"}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Make {studentName} independent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This unlinks the student from their current school and unenrolls them from every course they
                      gained through it. Courses they obtained any other way are left untouched. This can&apos;t be
                      undone from here.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleConfirmIndependent}
                    >
                      Make Independent
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" onClick={handleAssign} disabled={!selectedSchoolId || assignLoading}>
                {assignLoading ? "Saving..." : isLocked ? "Reassign" : "Lock to School"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
