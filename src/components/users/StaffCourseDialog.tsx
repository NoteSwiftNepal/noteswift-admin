"use client";

// A staff account's own course: pick it and it's given straight away. No
// payment, amount or method, and nothing in Sales or the CRM; the staff member
// uses the app as a student does. Removed with the usual Remove button.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StaffCourseDialog({
  open,
  onOpenChange,
  staffName,
  courses,
  coursesLoading,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  courses: { _id: string; title: string }[];
  coursesLoading: boolean;
  onSubmit: (courseId: string) => void;
  loading: boolean;
}) {
  const [courseId, setCourseId] = useState("");
  useEffect(() => {
    if (open) setCourseId("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Give a course</DialogTitle>
          <DialogDescription>
            {staffName} is a staff account. The course is given straight away with no payment, so they can use it as a student does. It doesn&apos;t appear in Sales or the CRM.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="staff-course">Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="staff-course">
              <SelectValue placeholder={coursesLoading ? "Loading courses…" : courses.length ? "Select course" : "No course left to give"} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!courseId || loading} onClick={() => onSubmit(courseId)}>
            {loading ? "Giving…" : "Give course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
