'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { approveTeacher, rejectTeacher, removeTeacher } from '@/lib/api/adminTeachers';

interface TeacherDetail {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  institution?: {
    name?: string;
    type?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
  };
  subjects?: Array<{
    name: string;
    level?: string;
    experience?: number;
  }>;
  qualifications?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
    year?: number;
    grade?: string;
  }>;
  experience?: {
    totalYears?: number;
    previousPositions?: Array<{
      title?: string;
      institution?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
  };
  bio?: string;
  verificationDocuments?: Record<string, Array<{
    name?: string;
    mimeType?: string;
    url?: string;
    publicId?: string;
    category?: string;
    uploadedAt?: string;
    size?: number;
  }>>;
  agreementAccepted?: boolean;
  onboardingStep?: string;
  onboardingComplete?: boolean;
  status?: string;
  approvalStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const teacherId = params.id as string;

  useEffect(() => {
    fetchTeacherDetail();
  }, [teacherId]);

  const fetchTeacherDetail = async () => {
    try {
      const { API_ENDPOINTS } = await import('@/config/api');
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        toast({ title: 'Authentication required', description: 'Please login to continue' });
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_ENDPOINTS.TEACHERS.GET(teacherId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch teacher details');
      }
      
      const json = await res.json();
      setTeacher(json.data?.teacher || null);
    } catch (err: any) {
      console.error('Fetch teacher error:', err);
      toast({ title: 'Load failed', description: err.message || 'Could not load teacher details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveTeacher(teacherId);
      toast({ title: 'Approved', description: 'Teacher approved successfully' });
      router.push('/dashboard/teacher-management');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Approve failed', description: err.message || 'Could not approve teacher' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await rejectTeacher(teacherId, rejectReason);
      toast({ title: 'Rejected', description: 'Teacher rejected' });
      router.push('/dashboard/teacher-management');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Reject failed', description: err.message || 'Could not reject teacher' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    setActionLoading(true);
    try {
      await removeTeacher(teacherId);
      toast({ title: 'Removed', description: 'Teacher removed successfully' });
      router.push('/dashboard/teacher-management');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Remove failed', description: err.message || 'Could not remove teacher' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            <div>Loading teacher details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div>Teacher not found</div>
          <Button onClick={() => router.push('/dashboard/teacher-management')} className="mt-4">
            Back to Teachers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Teacher Details'}
            </h1>
            <p className="text-gray-600">{teacher.email}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/teacher-management')}>
            Back to Teachers
          </Button>
        </div>
 {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.verificationDocuments && teacher.verificationDocuments['profile'] && teacher.verificationDocuments['profile'].length > 0 ? (
              <div className="flex items-center space-x-4">
                <img
                  src={teacher.verificationDocuments['profile'][0].url}
                  alt="Profile photo"
                  className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-lg"
                />
                <div>
                  <p className="text-sm text-gray-600">Uploaded: {new Date(teacher.verificationDocuments['profile'][0].uploadedAt || '').toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Size: {Math.round((teacher.verificationDocuments['profile'][0].size || 0) / 1024)} KB</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No profile photo uploaded</div>
            )}
          </CardContent>
        </Card>
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Name:</strong> {teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()}</div>
            <div><strong>Email:</strong> {teacher.email}</div>
            <div><strong>Phone:</strong> {teacher.phoneNumber || 'N/A'}</div>
            <div><strong>Date of Birth:</strong> {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
            <div><strong>Gender:</strong> {teacher.gender || 'N/A'}</div>
            {teacher.address && (
              <div><strong>Address:</strong> {[
                teacher.address.street,
                teacher.address.city,
                teacher.address.state,
                teacher.address.country,
                teacher.address.zipCode
              ].filter(Boolean).join(', ') || 'N/A'}</div>
            )}
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Institution:</strong> {teacher.institution?.name ? `${teacher.institution.name} (${teacher.institution.type})` : 'N/A'}</div>
            {teacher.institution?.address && (
              <div><strong>Institution Address:</strong> {[
                teacher.institution.address.street,
                teacher.institution.address.city,
                teacher.institution.address.state,
                teacher.institution.address.country,
                teacher.institution.address.zipCode
              ].filter(Boolean).join(', ') || 'N/A'}</div>
            )}
            <div><strong>Bio:</strong> {teacher.bio || 'N/A'}</div>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.subjects && teacher.subjects.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {teacher.subjects.map((subject, i) => (
                  <li key={i}>
                    {subject.name} — {subject.level || 'N/A'} — {subject.experience || 0} years experience
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">No subjects provided</div>
            )}
          </CardContent>
        </Card>

        {/* Qualifications */}
        <Card>
          <CardHeader>
            <CardTitle>Qualifications</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.qualifications && teacher.qualifications.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {teacher.qualifications.map((qual, i) => (
                  <li key={i}>
                    {qual.degree} in {qual.field} — {qual.institution} ({qual.year}) {qual.grade ? `— ${qual.grade}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">No qualifications provided</div>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Total Years:</strong> {teacher.experience?.totalYears ?? 'N/A'}</div>
            {teacher.experience?.previousPositions && teacher.experience.previousPositions.length > 0 ? (
              <div>
                <strong>Previous Positions:</strong>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  {teacher.experience.previousPositions.map((pos, i) => (
                    <li key={i}>
                      {pos.title} at {pos.institution} ({pos.startDate ? new Date(pos.startDate).toLocaleDateString() : ''} - {pos.endDate ? new Date(pos.endDate).toLocaleDateString() : 'Present'})
                      {pos.description && <div className="text-sm text-gray-600 mt-1">{pos.description}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-gray-500">No previous positions provided</div>
            )}
          </CardContent>
        </Card>

       

        {/* Agreement */}
        <Card>
          <CardHeader>
            <CardTitle>Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div><strong>Terms Accepted:</strong> {teacher.agreementAccepted ? 'Yes' : 'No'}</div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Onboarding Step:</strong> {teacher.onboardingStep || 'N/A'}</div>
            <div><strong>Onboarding Complete:</strong> {teacher.onboardingComplete ? 'Yes' : 'No'}</div>
            <div><strong>Status:</strong> {teacher.status || 'N/A'}</div>
            <div><strong>Approval Status:</strong> {teacher.approvalStatus || 'N/A'}</div>
            <div><strong>Created:</strong> {teacher.createdAt ? new Date(teacher.createdAt).toLocaleString() : 'N/A'}</div>
            <div><strong>Updated:</strong> {teacher.updatedAt ? new Date(teacher.updatedAt).toLocaleString() : 'N/A'}</div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show different actions based on approval status */}
            {!teacher.approvalStatus && (
              // Pending teacher - show approve/reject
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (optional)
                  </label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? 'Processing...' : 'Approve Teacher'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    variant="destructive"
                  >
                    {actionLoading ? 'Processing...' : 'Reject Teacher'}
                  </Button>
                </div>
              </>
            )}

            {teacher.approvalStatus === 'approved' && (
              // Approved teacher - show remove option
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    This teacher has been approved and is active
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleRemove}
                    disabled={actionLoading}
                    variant="destructive"
                  >
                    {actionLoading ? 'Processing...' : 'Remove Teacher'}
                  </Button>
                </div>
              </div>
            )}

            {teacher.approvalStatus === 'rejected' && (
              // Rejected teacher - show re-approve option
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    This teacher has been rejected
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? 'Processing...' : 'Re-approve Teacher'}
                  </Button>
                </div>
              </div>
            )}

            {(teacher.approvalStatus === 'removed' || teacher.approvalStatus === 'banned') && (
              // Removed/Banned teacher - show status only
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    This teacher has been {teacher.approvalStatus}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    No further actions available for this teacher.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}