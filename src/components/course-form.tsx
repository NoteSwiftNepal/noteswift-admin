"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2 } from "lucide-react";
import { handleSuggestTags } from "@/app/actions";
import { createCourse } from "@/lib/api/adminCourses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "./ui/card";
import { useLoading } from "@/context/loading-context";


const formSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters"),
  subject: z.string().min(2, "Subject must be at least 2 characters"),
  description: z.string().min(10, "Course description must be at least 10 characters"),
  tags: z.array(z.string()).optional(),
});

export function CourseForm() {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      tags: [],
    },
  });

  const onSuggestTags = async () => {
    const description = form.getValues("description");
    if (!description || description.length < 10) {
      toast({
        variant: "destructive",
        title: "Description too short",
        description: "Please provide a more detailed description to get tag suggestions.",
      });
      return;
    }

    setIsSuggesting(true);
    try {
      const result = await handleSuggestTags({ contentDescription: description });
      if (result.success && result.tags) {
        const currentTags = form.getValues("tags") || [];
        const newTags = result.tags.filter(tag => !currentTags.includes(tag));
        form.setValue("tags", [...currentTags, ...newTags]);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to get suggestions",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Could not fetch tag suggestions. Please try again.",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    startLoading();

    try {
      // Map form data to CourseData format
      const courseData = {
        title: values.title,
        description: values.description,
        subjects: [],
        tags: values.tags || [],
        status: 'Draft',
        type: 'free' as const,
        price: 0,
        program: values.subject, // Using subject as program
        faq: [],
      };

      const result = await createCourse(courseData);
      toast({
        title: "Course Created!",
        description: "The new course has been saved successfully.",
      });
      router.push("/dashboard/content");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create course",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
      stopLoading();
    }
  };

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to Calculus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Math" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the course content, goals, and target audience..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                <div>
                  <FormLabel>Content Tags</FormLabel>
                  <FormDescription>AI can suggest tags based on your content.</FormDescription>
                </div>
                 <Button type="button" onClick={onSuggestTags} disabled={isSuggesting} variant="outline">
                   {isSuggesting ? (
                     <Loader2 className="animate-spin" />
                   ) : (
                     <Wand2 />
                   )}
                   Suggest Tags
                 </Button>
               </div>
              {form.watch("tags") && form.watch("tags")!.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.watch("tags")!.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save Course
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
