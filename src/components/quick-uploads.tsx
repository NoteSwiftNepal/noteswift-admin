
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Video,
  ClipboardList,
  CalendarClock,
  StickyNote,
  BookCopy,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/context/loading-context";

const uploadActions = [
  {
    title: "Upload Class Notes",
    description: "PDFs, Docs",
    icon: StickyNote,
    dialogTitle: "Upload Class Notes",
    dialogDescription: "Select a course and upload your notes file.",
  },
  {
    title: "Upload Video",
    description: "MP4, MOV",
    icon: Video,
    dialogTitle: "Upload Video",
    dialogDescription: "Select a course and upload your video file.",
  },
  {
    title: "Add Model Question",
    description: "Question papers",
    icon: BookCopy,
    dialogTitle: "Add Model Question",
    dialogDescription:
      "Select a course and year to add a model question paper.",
  },
  {
    title: "Add Assignment",
    description: "Set a deadline",
    icon: ClipboardList,
    dialogTitle: "Add Assignment",
    dialogDescription: "Select a course and create a new assignment.",
  },
  {
    title: "Schedule Live Class",
    description: "Google Meet, Zoom",
    icon: CalendarClock,
    dialogTitle: "Schedule Live Class",
    dialogDescription: "Select a course and schedule a new live session.",
  },
];

type Course = {
  _id: string;
  title: string;
};

export function QuickUploads({ courses }: { courses: Course[] }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [openDialogs, setOpenDialogs] = useState<{ [key: string]: boolean }>({});
  const { startLoading, stopLoading } = useLoading();

  const handleUpload = async (title: string) => {
    setIsUploading(true);
        startLoading();

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: `${title} Action Successful!`,
      description: "Your content has been added to the course.",
    });

    setIsUploading(false);
        stopLoading();

    setOpenDialogs(prev => ({ ...prev, [title]: false }));
  };

  const handleOpenChange = (title: string, isOpen: boolean) => {
    // Prevent closing the dialog when the upload is in progress
    if (isUploading && !isOpen) return;
    setOpenDialogs(prev => ({ ...prev, [title]: isOpen }));
  }

  return (
    <Card className="shadow-md w-full">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Quickly add new content to your courses.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {uploadActions.map((action) => (
          <Dialog key={action.title} open={openDialogs[action.title] || false} onOpenChange={(isOpen) => handleOpenChange(action.title, isOpen)}>
            <DialogTrigger asChild>
              <button
                className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors flex flex-col items-start gap-2 h-full disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={courses.length === 0}
              >
                <action.icon className="h-6 w-6 text-primary" />
                <p className="font-semibold">{action.title}</p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{action.dialogTitle}</DialogTitle>
                <DialogDescription>{action.dialogDescription}</DialogDescription>
              </DialogHeader>
              {action.title === "Schedule Live Class" ? (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="course" className="text-right">Course</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course._id} value={course._id}>{course.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher" className="text-right">Teacher</Label>
                    <Input id="teacher" placeholder="e.g., Prof. Smith" className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Date</Label>
                    <Input id="date" type="date" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Time</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      <Input id="time-from" type="time" aria-label="From time" />
                      <Input id="time-to" type="time" aria-label="To time" />
                    </div>
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="thumbnail" className="text-right">Thumbnail</Label>
                    <Input id="thumbnail" type="file" className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea id="description" placeholder="A short description of the class..." className="col-span-3" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="course" className="text-right">Course</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course._id} value={course._id}>{course.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="file" className="text-right">File</Label>
                    <Input id="file" type="file" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea id="description" placeholder="A short description of the content" className="col-span-3" />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => handleOpenChange(action.title, false)} disabled={isUploading}>Cancel</Button>
                <Button onClick={() => handleUpload(action.title)} disabled={isUploading}>
                  {isUploading && <Loader2 className="animate-spin" />}
                  {action.title.includes("Schedule") ? "Schedule" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}
      </CardContent>
    </Card>
  );
}
