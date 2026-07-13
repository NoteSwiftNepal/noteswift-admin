"use client";

import { API_ENDPOINTS, createFetchOptions } from '@/config/api';

export type TeacherSummary = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  institution?: { name?: string; type?: string };
  subjects?: Array<{ name: string; level?: string }>;
  qualifications?: Array<any>;
  onboardingStep?: string;
  onboardingComplete?: boolean;
  createdAt?: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  experience?: {
    totalYears?: number;
    previousPositions?: Array<{ title?: string; institution?: string; startDate?: string; endDate?: string; description?: string }>;
  };
  verificationDocuments?: {
    profile?: Array<{ name?: string; mimeType?: string; url?: string; publicId?: string; size?: number; uploadedAt?: string; }>;
  };
  assignedCourses?: Array<{
    courseId: string;
    courseName: string;
    subject: string;
    assignedAt?: string;
  }>;
  schoolId?: string | null;
};

function withSchoolFilter(url: string, schoolId?: string): string {
  if (!schoolId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}schoolId=${schoolId}`;
}

export async function fetchPendingTeachers(schoolId?: string): Promise<TeacherSummary[]> {
  const res = await fetch(withSchoolFilter(`${API_ENDPOINTS.TEACHERS.LIST}?status=pending_approval`, schoolId), {
    ...createFetchOptions('GET'),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch pending teachers');
  const json = await res.json();
  return json.data?.teachers || [];
}

export async function approveTeacher(id: string, notify = true) {
  const res = await fetch(API_ENDPOINTS.TEACHERS.APPROVE(id), createFetchOptions('POST', { notify }));
  if (!res.ok) throw new Error('Failed to approve teacher');
  return res.json();
}

export async function fetchApprovedTeachers(schoolId?: string): Promise<TeacherSummary[]> {
  const res = await fetch(withSchoolFilter(`${API_ENDPOINTS.TEACHERS.LIST}?status=approved`, schoolId), {
    ...createFetchOptions('GET'),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch approved teachers');
  const json = await res.json();
  return json.data?.teachers || [];
}

export async function fetchAllTeachers(schoolId?: string): Promise<TeacherSummary[]> {
  const res = await fetch(withSchoolFilter(API_ENDPOINTS.TEACHERS.LIST, schoolId), {
    ...createFetchOptions('GET'),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch all teachers');
  const json = await res.json();
  return json.data?.teachers || [];
}

export async function fetchRejectedTeachers(schoolId?: string): Promise<TeacherSummary[]> {
  const res = await fetch(withSchoolFilter(`${API_ENDPOINTS.TEACHERS.LIST}?status=rejected`, schoolId), {
    ...createFetchOptions('GET'),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch rejected teachers');
  const json = await res.json();
  return json.data?.teachers || [];
}

export async function assignTeacherSchool(id: string, schoolId: string | null) {
  const res = await fetch(API_ENDPOINTS.TEACHERS.ASSIGN_SCHOOL(id), createFetchOptions('POST', { schoolId }));
  if (!res.ok) throw new Error('Failed to update teacher school assignment');
  return res.json();
}

export async function removeTeacher(id: string, reason?: string, notify = true) {
  const res = await fetch(API_ENDPOINTS.TEACHERS.REMOVE(id), createFetchOptions('POST', { reason, notify }));
  if (!res.ok) throw new Error('Failed to remove teacher');
  return res.json();
}

export async function rejectTeacher(id: string, reason?: string, notify = true) {
  const res = await fetch(API_ENDPOINTS.TEACHERS.REJECT(id), createFetchOptions('POST', { reason, notify }));
  if (!res.ok) throw new Error('Failed to reject teacher');
  return res.json();
}