"use client";

export type CourseData = {
  _id?: string;
  title: string;
  description: string;
  subjects?: {
    _id?: string;
    name: string;
    description?: string;
    modules?: {
      _id?: string;
      name: string;
      description: string;
      duration?: string;
      hasVideo?: boolean;
      hasNotes?: boolean;
      liveClassSchedule?: any[];
      createdAt?: string;
      updatedAt?: string;
    }[];
    assignedTeacher?: {
      _id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      email: string;
      profilePhoto?: string;
    };
    createdAt?: string;
    updatedAt?: string;
  }[];
  tags: string[];
  status: string;
  type: 'featured' | 'pro' | 'free' | 'recommended' | 'upcoming';
  price?: number;
  program: string;
  duration?: string;
  rating?: number;
  enrolledCount?: number;
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
};

export async function createCourse(courseData: CourseData): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(API_ENDPOINTS.COURSES.CREATE, createFetchOptions('POST', courseData));

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create course');
  }

  const json = await res.json();
  return json.result.course;
}

export async function updateCourse(id: string, courseData: Partial<CourseData>): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(API_ENDPOINTS.COURSES.UPDATE(id), createFetchOptions('PUT', courseData));

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update course');
  }

  const json = await res.json();
  return json.result.course;
}

export type ChapterData = {
  name: string;
  description: string;
  duration?: string;
};

export async function updateChapter(
  courseId: string,
  subjectId: string,
  moduleId: string,
  chapterData: ChapterData
): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(
    API_ENDPOINTS.COURSES.UPDATE_CHAPTER(courseId, subjectId, moduleId),
    createFetchOptions('PUT', chapterData)
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update chapter');
  }

  const json = await res.json();
  return json.result.course;
}

export async function deleteChapter(
  courseId: string,
  subjectId: string,
  moduleId: string
): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(
    API_ENDPOINTS.COURSES.DELETE_CHAPTER(courseId, subjectId, moduleId),
    createFetchOptions('DELETE')
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete chapter');
  }

  const json = await res.json();
  return json.result.course;
}

export async function deleteSubject(
  courseId: string,
  subjectId: string
): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(
    API_ENDPOINTS.COURSES.DELETE_SUBJECT(courseId, subjectId),
    createFetchOptions('DELETE')
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete subject');
  }

  const json = await res.json();
  return json.result.course;
}

export async function uploadCourseThumbnail(courseId: string, file: File): Promise<string> {
  const { API_ENDPOINTS } = await import('@/config/api');

  const formData = new FormData();
  formData.append('thumbnail', file);

  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(API_ENDPOINTS.COURSES.UPLOAD_THUMBNAIL(courseId), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to upload thumbnail');
  }

  const json = await res.json();
  return json.result.thumbnail;
}

export async function getCourse(id: string): Promise<CourseData> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const res = await fetch(API_ENDPOINTS.COURSES.GET(id), createFetchOptions('GET'));

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch course');
  }

  const json = await res.json();
  return json.result.course;
}