
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Eye, Save, X, Star, BookOpen, PlayCircle, Award, Upload, Lock, Clock, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { createCourse, updateCourse, getCourse } from '@/lib/api/adminCourses';
import { toast } from '@/hooks/use-toast';
import { v2 as cloudinary } from 'cloudinary';

interface Module {
  name: string;
  description: string;
  duration?: string;
}

interface Subject {
  name: string;
  description?: string;
  modules?: Module[];
}

interface Course {
  _id?: string;
  title: string;
  description: string;
  subjects?: Subject[];
  tags: string[];
  status: string;
  type: 'featured' | 'pro' | 'free' | 'recommended' | 'upcoming';
  price?: number;
  program: string;
  duration?: string;
  rating?: number;
  enrolledCount?: number;
  skills?: string[];
  features?: string[];
  learningPoints?: string[];
  offeredBy?: string;
  courseOverview?: string;
  syllabus?: {
    moduleNumber: number;
    title: string;
    description: string;
  }[];
  faq?: {
    question: string;
    answer: string;
  }[];
  icon?: string;
  thumbnail?: string;
  isFeatured?: boolean;
  keyFeatures?: string[];
}

// This is now a full page, not just a box/modal. Route: /dashboard/courses/editor
export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.id as string;

  // Debug environment variables
  useEffect(() => {
    console.log('Environment check:', {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      hasCloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      hasUploadPreset: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    });
  }, []);

  const [formData, setFormData] = useState<Course>(() => {
    const typeParam = searchParams?.get('type') as 'featured' | 'pro' | 'free' | 'recommended' | 'upcoming' | null;
    return {
      title: '',
      description: '',
      subjects: [],
      tags: typeParam === 'recommended' || typeParam === 'upcoming' ? [typeParam] : [],
      status: 'Draft',
      type: typeParam || 'pro',
      price: 0,
      program: 'SEE',
      duration: '',
      rating: 0,
      enrolledCount: 0,
      skills: [],
      features: [],
      learningPoints: [],
      offeredBy: '',
      courseOverview: '',
      syllabus: [],
      faq: [],
      icon: 'school',
      thumbnail: '',
      isFeatured: typeParam === 'featured',
      keyFeatures: [],
    };
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    keyFeatures: true,
    learningPoints: true,
    skills: true,
    features: true,
    courseContent: true,
    faq: true,
    courseContentSubjects: {} as { [key: number]: { expanded: boolean; modules: { [key: number]: boolean } } }
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);

  // Load existing course data if editing
  useEffect(() => {
    if (courseId && courseId !== 'new') {
      const loadCourse = async () => {
        try {
          setIsLoading(true);
          const course = await getCourse(courseId);
          setFormData(course);
        } catch (error) {
          console.error('Error loading course:', error);
          toast({
            title: "Error",
            description: `Failed to load course: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadCourse();
    }
  }, [courseId]);

  // Predefined key features options
  const availableKeyFeatures = [
    { id: 'mobile-friendly', icon: 'phone-iphone', title: 'Mobile Friendly', subtitle: 'Complete the course entirely on mobile.' },
    { id: 'online', icon: 'all-inclusive', title: '100% Online', subtitle: 'Learn at your own pace with flexible access.' },
    { id: 'flexible-schedule', icon: 'update', title: 'Flexible Schedule', subtitle: 'Adapt study sessions to your routine.' },
    { id: 'time-saving', icon: 'hourglass-empty', title: 'Time Saving', subtitle: 'Time efficient learning modules.' },
    { id: 'beginner-friendly', icon: 'bar-chart', title: 'Beginner-Friendly', subtitle: 'No prior experience required.' },
    { id: 'certified', icon: 'verified', title: 'Certified', subtitle: 'Receive a certificate upon completion.' },
    { id: 'lifetime-access', icon: 'all-inclusive', title: 'Lifetime Access', subtitle: 'Access content anytime, anywhere.' },
    { id: 'expert-instructors', icon: 'school', title: 'Expert Instructors', subtitle: 'Learn from industry professionals.' },
  ];

  const updateFormData = (field: keyof Course, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: keyof Course, item: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[] || []), item]
    }));
  };

  const removeFromArray = (field: keyof Course, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof Course, index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item, i) => i === index ? value : item)
    }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCourseContentSubject = (subjectIndex: number) => {
    setExpandedSections(prev => {
      const isExpanding = !prev.courseContentSubjects[subjectIndex]?.expanded;
      const subjectModules = formData.subjects?.[subjectIndex]?.modules || [];
      
      return {
        ...prev,
        courseContentSubjects: {
          ...prev.courseContentSubjects,
          [subjectIndex]: {
            ...prev.courseContentSubjects[subjectIndex],
            expanded: isExpanding,
            // Initialize modules to expanded when subject is expanded
            ...(isExpanding && {
              modules: subjectModules.reduce((acc, _, index) => {
                acc[index] = true;
                return acc;
              }, {} as { [key: number]: boolean })
            })
          }
        }
      };
    });
  };

  const toggleCourseContentModule = (subjectIndex: number, moduleIndex: number) => {
    setExpandedSections(prev => ({
      ...prev,
      courseContentSubjects: {
        ...prev.courseContentSubjects,
        [subjectIndex]: {
          ...prev.courseContentSubjects[subjectIndex],
          modules: {
            ...prev.courseContentSubjects[subjectIndex]?.modules,
            [moduleIndex]: !prev.courseContentSubjects[subjectIndex]?.modules?.[moduleIndex]
          }
        }
      }
    }));
  };

  const generateAIContent = async (type: 'learningPoints' | 'skills' | 'features' | 'faq') => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please enter course title and description first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(type);

    try {
      // This is a placeholder for AI generation - in a real implementation,
      // you would call an AI service here
      const prompt = `Based on the course "${formData.title}" with description: "${formData.description}", generate ${type === 'learningPoints' ? 'learning points' : type === 'skills' ? 'skills that will be mastered' : type === 'features' ? 'package features' : 'frequently asked questions'}.`;

      // Simulate AI call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock AI responses based on type
      let generatedContent: any[] = [];

      switch (type) {
        case 'learningPoints':
          generatedContent = [
            "Comprehensive video lectures with expert instructors",
            "Interactive quizzes and assignments",
            "Downloadable study materials and resources",
            "24/7 access to course content",
            "Certificate of completion"
          ];
          break;
        case 'skills':
          generatedContent = ["Problem Solving", "Critical Thinking", "Subject Mastery", "Practical Application"];
          break;
        case 'features':
          generatedContent = [
            "Lifetime access to all course materials",
            "Mobile and desktop compatibility",
            "Regular content updates",
            "Community forum access",
            "Progress tracking and certificates"
          ];
          break;
        case 'faq':
          generatedContent = [
            { question: "How long do I have access to the course?", answer: "You have lifetime access to all course materials." },
            { question: "Is there a certificate upon completion?", answer: "Yes, you will receive a certificate after completing all modules." },
            { question: "Can I access the course on mobile devices?", answer: "Yes, the course is fully compatible with mobile and tablet devices." }
          ];
          break;
      }

      if (type === 'faq') {
        updateFormData(type, [...(formData[type] || []), ...generatedContent]);
      } else {
        updateFormData(type, [...(formData[type] || []), ...generatedContent]);
      }

      toast({
        title: "AI Content Generated",
        description: `Successfully generated ${generatedContent.length} ${type === 'learningPoints' ? 'learning points' : type === 'skills' ? 'skills' : type === 'features' ? 'features' : 'FAQ items'}`,
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(null);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Check environment variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName) {
      toast({
        title: "Configuration Error",
        description: "Cloudinary cloud name is not configured",
        variant: "destructive",
      });
      return;
    }

    if (!uploadPreset) {
      toast({
        title: "Configuration Error",
        description: "Cloudinary upload preset is not configured. Please create 'noteswift_courses' preset in Cloudinary dashboard or update .env to use existing 'ml_default' preset.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, JPEG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('Starting image upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        cloudName,
        uploadPreset
      });

      // Upload to Cloudinary using direct API
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', uploadPreset);
      formDataUpload.append('folder', 'noteswift/course-thumbnails');

      console.log('Sending request to Cloudinary...');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formDataUpload,
        }
      );

      // Try the configured preset first, fallback to ml_default if it fails
      let currentPreset = uploadPreset;
      let uploadResponse = response;

      if (!response.ok && uploadPreset === 'noteswift_courses') {
        console.log('Primary preset failed, trying fallback preset: ml_default');
        formDataUpload.set('upload_preset', 'ml_default');
        currentPreset = 'ml_default';

        uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formDataUpload,
          }
        );
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Cloudinary upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          responseBody: errorText,
          cloudName,
          uploadPreset: currentPreset
        });

        let errorMessage = `Upload failed (${uploadResponse.status}): ${uploadResponse.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await uploadResponse.json();
      updateFormData('thumbnail', data.secure_url);

      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveCourse = async () => {
    try {
      setIsSaving(true);

      // Client-side validation for required fields
      if (!formData.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Course title is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.description.trim()) {
        toast({
          title: "Validation Error",
          description: "Course description is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.type) {
        toast({
          title: "Validation Error",
          description: "Course type is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.program) {
        toast({
          title: "Validation Error",
          description: "Program is required",
          variant: "destructive",
        });
        return;
      }

      const courseData = { ...formData, status: 'Draft' };

      if (formData._id) {
        // Update existing course
        await updateCourse(formData._id, courseData);
      } else {
        // Create new course
        const newCourse = await createCourse(courseData);
        setFormData(prev => ({ ...prev, _id: newCourse._id }));
      }

      toast({
        title: "Success",
        description: "Course saved as draft successfully!",
      });
      
      // Redirect to courses list
      router.push('/dashboard/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Error",
        description: `Failed to save course: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishCourse = async () => {
    try {
      setIsPublishing(true);

      // Client-side validation for required fields
      if (!formData.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Course title is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.description.trim()) {
        toast({
          title: "Validation Error",
          description: "Course description is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.type) {
        toast({
          title: "Validation Error",
          description: "Course type is required",
          variant: "destructive",
        });
        return;
      }

      if (!formData.program) {
        toast({
          title: "Validation Error",
          description: "Program is required",
          variant: "destructive",
        });
        return;
      }

      const courseData = { ...formData, status: 'Published' };

      if (formData._id) {
        // Update existing course
        await updateCourse(formData._id, courseData);
      } else {
        // Create new course
        const newCourse = await createCourse(courseData);
        setFormData(prev => ({ ...prev, _id: newCourse._id }));
      }

      toast({
        title: "Success",
        description: "Course published successfully!",
      });
      
      // Redirect to courses list
      router.push('/dashboard/courses');
    } catch (error) {
      console.error('Error publishing course:', error);
      toast({
        title: "Error",
        description: `Failed to publish course: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <div className="mx-auto py-8 px-6 h-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Course Editor</h1>
              <Badge variant={formData.status === 'Published' ? 'default' : 'secondary'} className={formData.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {formData.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-2">Create and manage your course content</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            {formData.status === 'Published' && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/courses/${courseId}/subjects`)}
                className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <BookOpen className="w-4 h-4" />
                Edit Subjects
              </Button>
            )}
            <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handlePublishCourse} disabled={isPublishing || isSaving}>
              <Upload className="w-4 h-4" />
              {isPublishing ? 'Publishing...' : 'Publish Course'}
            </Button>
            <Button className="flex items-center gap-2" onClick={handleSaveCourse} disabled={isPublishing || isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Course'}
            </Button>
          </div>
        </div>

        <div className={`grid ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-8 h-full`}>
          {/* Editor Panel */}
          <div className="space-y-6 overflow-y-auto">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('basicInfo')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.basicInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.basicInfo ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.basicInfo && (
                <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => updateFormData('title', e.target.value)}
                      placeholder="Enter course title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="offeredBy">Offered By</Label>
                    <Input
                      id="offeredBy"
                      value={formData.offeredBy}
                      onChange={(e) => updateFormData('offeredBy', e.target.value)}
                      placeholder="Instructor or organization"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Course Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Enter course description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program">Program</Label>
                    <Select value={formData.program} onValueChange={(value) => updateFormData('program', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEE">SEE (Secondary Level)</SelectItem>
                        <SelectItem value="+2">+2 (High School)</SelectItem>
                        <SelectItem value="Bachelor">Bachelor (Undergraduate)</SelectItem>
                        <SelectItem value="CTEVT">CTEVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => updateFormData('duration', e.target.value)}
                      placeholder="e.g., 3 months, 6 weeks"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => updateFormData('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.type === 'pro' && (
                    <div>
                      <Label htmlFor="price">Price (Rs)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) => updateFormData('price', e.target.value ? Number(e.target.value) : 0)}
                        placeholder="Enter price"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Input
                      id="rating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating || ''}
                      onChange={(e) => updateFormData('rating', e.target.value ? Number(e.target.value) : 0)}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={formData.icon} onValueChange={(value) => updateFormData('icon', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="menu-book">Book</SelectItem>
                        <SelectItem value="auto-stories">Stories</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="science">Science</SelectItem>
                        <SelectItem value="calculate">Math</SelectItem>
                        <SelectItem value="language">Language</SelectItem>
                        <SelectItem value="palette">Art</SelectItem>
                        <SelectItem value="music-note">Music</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="thumbnail">Course Thumbnail</Label>
                    <div className="space-y-3">
                      {/* Current Image Preview */}
                      {formData.thumbnail && (
                        <div className="relative">
                          <img
                            src={formData.thumbnail}
                            alt="Course thumbnail"
                            className="w-full max-w-xs h-32 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => updateFormData('thumbnail', '')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* File Upload */}
                      <div className="flex items-center gap-3">
                        <Input
                          id="thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          disabled={isUploading}
                          className="flex-1"
                        />
                        {isUploading && (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600">Uploading...</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        Upload a high-quality image (max 5MB). Recommended size: 1200x675px
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="isFeatured">Featured</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        checked={formData.isFeatured}
                        onChange={(e) => updateFormData('isFeatured', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isFeatured" className="text-sm">Mark as featured</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="courseOverview">Course Overview</Label>
                  <Textarea
                    id="courseOverview"
                    value={formData.courseOverview}
                    onChange={(e) => updateFormData('courseOverview', e.target.value)}
                    placeholder="Brief overview of the course"
                    rows={3}
                  />
                </div>
              </CardContent>
              )}
            </Card>

            {/* Key Features Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Key Features
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('keyFeatures')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.keyFeatures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.keyFeatures ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
                <p className="text-sm text-gray-600">Select which features to highlight for this course</p>
              </CardHeader>
              {expandedSections.keyFeatures && (
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableKeyFeatures.map((feature) => {
                    const isSelected = formData.keyFeatures?.includes(feature.id) || false;
                    return (
                      <div
                        key={feature.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          const currentFeatures = formData.keyFeatures || [];
                          if (isSelected) {
                            updateFormData('keyFeatures', currentFeatures.filter(id => id !== feature.id));
                          } else {
                            updateFormData('keyFeatures', [...currentFeatures, feature.id]);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {feature.title}
                            </h4>
                            <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {feature.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              )}
            </Card>

            {/* Learning Points */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    What's Included
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('learningPoints')}
                      className="flex items-center gap-2"
                    >
                      {expandedSections.learningPoints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expandedSections.learningPoints ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedSections.learningPoints && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Include this section in the course</p>
                    <input
                      type="checkbox"
                      checked={formData.learningPoints && formData.learningPoints.length > 0}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          updateFormData('learningPoints', []);
                        } else {
                          updateFormData('learningPoints', ['']);
                        }
                      }}
                      className="rounded"
                    />
                  </div>

                  {formData.learningPoints && formData.learningPoints.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Generate content with AI</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateAIContent('learningPoints')}
                          disabled={isGeneratingAI === 'learningPoints'}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isGeneratingAI === 'learningPoints' ? 'Generating...' : 'Generate with AI'}
                        </Button>
                      </div>

                      {formData.learningPoints.map((point, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={point}
                            onChange={(e) => updateArrayItem('learningPoints', index, e.target.value)}
                            placeholder="Learning point"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromArray('learningPoints', index)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => addToArray('learningPoints', '')}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Learning Point
                      </Button>
                    </>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Skills You Will Master</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('skills')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.skills ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.skills && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Generate skills with AI</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent('skills')}
                      disabled={isGeneratingAI === 'skills'}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingAI === 'skills' ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.skills?.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeFromArray('skills', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            addToArray('skills', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add a skill"]') as HTMLInputElement;
                        const value = input?.value.trim();
                        if (value) {
                          addToArray('skills', value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Package Features</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('features')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.features ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.features ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.features && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Generate features with AI</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent('features')}
                      disabled={isGeneratingAI === 'features'}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingAI === 'features' ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>

                  {formData.features?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateArrayItem('features', index, e.target.value)}
                        placeholder="Package feature"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromArray('features', index)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => addToArray('features', '')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Feature
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Course Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center justify-between">
                    <span>Course Content</span>
                    {formData.status === 'Published' && (
                      <Badge variant="secondary" className="text-xs">
                        Locked after publish - use "Edit Subjects" button
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('courseContent')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.courseContent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.courseContent ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.courseContent && (
                <CardContent className="space-y-6">
                {formData.status === 'Published' ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Content Locked</p>
                    <p className="text-sm mb-4">
                      Subjects and modules are locked after publishing to maintain data integrity.
                    </p>
                    <Button
                      onClick={() => router.push(`/dashboard/courses/${courseId}/subjects`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Edit Subjects & Modules
                    </Button>
                  </div>
                ) : (
                  <>
                    {formData.subjects?.map((subject, subjectIndex) => (
                      <div key={subjectIndex} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCourseContentSubject(subjectIndex)}
                              className="flex items-center gap-2 p-1"
                            >
                              {expandedSections.courseContentSubjects[subjectIndex]?.expanded !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <h4 className="font-semibold">Subject {subjectIndex + 1}</h4>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromArray('subjects', subjectIndex)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>

                        {expandedSections.courseContentSubjects[subjectIndex]?.expanded !== false && (
                          <>
                            <div className="grid grid-cols-1 gap-4">
                              <Input
                                value={subject.name}
                                onChange={(e) => updateArrayItem('subjects', subjectIndex, {
                                  ...subject,
                                  name: e.target.value
                                })}
                                placeholder="Subject name"
                              />
                              <Textarea
                                value={subject.description || ''}
                                onChange={(e) => updateArrayItem('subjects', subjectIndex, {
                                  ...subject,
                                  description: e.target.value
                                })}
                                placeholder="Subject description"
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Modules</Label>
                              {subject.modules?.map((module, moduleIndex) => (
                                <div key={moduleIndex} className="pl-4 border-gray-200 space-y-2 p-3 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleCourseContentModule(subjectIndex, moduleIndex)}
                                      className="flex items-center gap-2 p-1"
                                    >
                                      {expandedSections.courseContentSubjects[subjectIndex]?.modules?.[moduleIndex] !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                    <span className="text-sm font-medium">Module {moduleIndex + 1}</span>
                                  </div>

                                  {expandedSections.courseContentSubjects[subjectIndex]?.modules?.[moduleIndex] !== false && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={module.name}
                                          onChange={(e) => {
                                            const newModules = [...subject.modules!];
                                            newModules[moduleIndex] = { ...newModules[moduleIndex], name: e.target.value };
                                            updateArrayItem('subjects', subjectIndex, { ...subject, modules: newModules });
                                          }}
                                          placeholder="Module name"
                                          className="flex-1"
                                        />
                                        <Input
                                          value={module.duration || ''}
                                          onChange={(e) => {
                                            const newModules = [...subject.modules!];
                                            newModules[moduleIndex] = { ...newModules[moduleIndex], duration: e.target.value };
                                            updateArrayItem('subjects', subjectIndex, { ...subject, modules: newModules });
                                          }}
                                          placeholder="Duration"
                                          className="w-24"
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newModules = subject.modules!.filter((_, i) => i !== moduleIndex);
                                            updateArrayItem('subjects', subjectIndex, { ...subject, modules: newModules });
                                          }}
                                        >
                                          <Minus className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <Textarea
                                        value={module.description}
                                        onChange={(e) => {
                                          const newModules = [...subject.modules!];
                                          newModules[moduleIndex] = { ...newModules[moduleIndex], description: e.target.value };
                                          updateArrayItem('subjects', subjectIndex, { ...subject, modules: newModules });
                                        }}
                                        placeholder="Module description"
                                        rows={2}
                                      />
                                    </>
                                  )}
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newModules = [...(subject.modules || []), { name: '', description: '', duration: '' }];
                                  updateArrayItem('subjects', subjectIndex, { ...subject, modules: newModules });
                                }}
                                className="ml-4"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Module
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addToArray('subjects', { name: '', description: '', modules: [{ name: '', description: '', duration: '' }] })}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </Button>
                  </>
                )}
              </CardContent>
              )}
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('faq')}
                    className="flex items-center gap-2"
                  >
                    {expandedSections.faq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedSections.faq ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.faq && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Generate FAQ with AI</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent('faq')}
                      disabled={isGeneratingAI === 'faq'}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingAI === 'faq' ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>

                  {formData.faq?.map((faq, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">FAQ {index + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromArray('faq', index)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={faq.question}
                        onChange={(e) => updateArrayItem('faq', index, { ...faq, question: e.target.value })}
                        placeholder="Question"
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateArrayItem('faq', index, { ...faq, answer: e.target.value })}
                        placeholder="Answer"
                        rows={3}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => addToArray('faq', { question: '', answer: '' })}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add FAQ
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-6 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-6 p-4 bg-white rounded-lg">
                      {/* Package Type Badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant={formData.isFeatured ? "default" : "secondary"} className="flex items-center gap-1">
                          {formData.isFeatured ? <Star className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                          {formData.isFeatured ? 'Featured ' : ''}{formData.type === 'pro' ? 'Pro' : 'Free'} Package
                        </Badge>
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl font-bold text-gray-900">
                        {formData.title || 'Course Title'}
                      </h2>

                      {/* Price */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-lg font-semibold">
                          {formData.type === 'pro' ? `Rs. ${formData.price || 0}` : 'Free'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {formData.type === 'pro' ? '• 1 year Premium Access' : '• Lifetime Access'}
                        </span>
                      </div>

                      {/* Program, Duration, Rating */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {formData.program && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {formData.program}
                          </span>
                        )}
                        {formData.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formData.duration}
                          </span>
                        )}
                        {formData.rating && formData.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {formData.rating}/5
                          </span>
                        )}
                      </div>

                      {/* Offered By */}
                      <div>
                        <p className="text-sm text-gray-500">Offered by</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formData.offeredBy || 'NoteSwift Team'}
                        </p>
                      </div>

                      <Separator />

                      {/* Course Description */}
                      <div>
                        <h3 className="text-lg font-bold mb-2">Course Description</h3>
                        <p className="text-gray-700">
                          {formData.description || 'Course description will appear here...'}
                        </p>
                      </div>

                      {/* Course Overview */}
                      <div>
                        <h3 className="text-lg font-bold mb-2">Package Overview</h3>
                        <p className="text-gray-700">
                          {formData.courseOverview || 'Course overview will appear here...'}
                        </p>
                      </div>

                      {/* Key Features */}
                      {formData.keyFeatures && formData.keyFeatures.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-4">Key Features</h3>
                          <div className="space-y-4">
                            {formData.keyFeatures.map((featureId) => {
                              const feature = availableKeyFeatures.find(f => f.id === featureId);
                              return feature ? (
                                <div key={feature.id} className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                                    <p className="text-gray-600 text-sm">{feature.subtitle}</p>
                                  </div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* What's Included */}
                      {formData.learningPoints && formData.learningPoints.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-4">What's Included</h3>
                          <div className="space-y-2">
                            {formData.learningPoints.map((point, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                <p className="text-gray-700">{point}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills */}
                      {formData.skills && formData.skills.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-3">Skills You Will Master</h3>
                          <div className="flex flex-wrap gap-2">
                            {formData.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Package Features */}
                      {formData.features && formData.features.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-4">All Package Features</h3>
                          <div className="space-y-2">
                            {formData.features.map((feature, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                <p className="text-gray-700">{feature}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Course Content */}
                      {formData.subjects && formData.subjects.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Course Content</h3>
                            {formData.status === 'Published' && (
                              <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-200">
                                <Lock className="w-3 h-3" />
                                Subjects Locked
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-3">
                            {formData.subjects.map((subject, subjectIndex) => (
                              <div key={subjectIndex} className={`border rounded-lg p-4 ${formData.status === 'Published' ? 'bg-gray-50 border-gray-200' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">Subject {subjectIndex + 1}</Badge>
                                  <span className="text-sm text-gray-500">
                                    • {subject.modules?.length || 0} modules
                                  </span>
                                  {formData.status === 'Published' && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                      <Lock className="w-3 h-3 mr-1" />
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-gray-900">{subject.name}</h4>

                                {subject.modules && subject.modules.length > 0 && (
                                  <div className="space-y-2">
                                    {subject.modules.map((module, moduleIndex) => (
                                      <div key={moduleIndex} className={`pl-4 ${formData.status === 'Published' ? 'border-orange-200 bg-orange-25' : 'border-gray-200'}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-700">
                                            Module {moduleIndex + 1}
                                          </span>
                                          <span className="text-sm text-gray-500">{module.duration}</span>
                                        </div>
                                        <p className="text-gray-800 font-medium">{module.name}</p>
                                        <p className="text-sm text-gray-600">{module.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {formData.status === 'Published' && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 text-orange-800">
                                <Lock className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Course content is locked after publishing. Use "Edit Subjects" button to manage subjects and teacher assignments.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* FAQ */}
                      {formData.faq && formData.faq.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-4">Frequently Asked Questions</h3>
                          <div className="space-y-3">
                            {formData.faq.map((faq, index) => (
                              <div key={index} className="border-b pb-3">
                                <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                                <p className="text-sm text-gray-600">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
