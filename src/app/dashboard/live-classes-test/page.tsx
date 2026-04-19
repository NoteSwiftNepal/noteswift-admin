"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ENDPOINTS, createFetchOptions } from "@/config/api";

interface LiveClassStats {
  total: number;
  withRecordings: number;
  orphanedCount: number;
  totalStorageBytes: number;
  byStatus: {
    scheduled: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  byRecordingStatus: {
    processing: number;
    ready: number;
    failed: number;
    noRecording: number;
  };
}

interface OrphanedLiveClass {
  _id: string;
  title: string;
  teacherName: string;
  subjectName: string;
  scheduledAt: string;
  recordingStatus?: string;
  recordingSize?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function LiveClassesTestPage() {
  const [stats, setStats] = useState<LiveClassStats | null>(null);
  const [orphanedClasses, setOrphanedClasses] = useState<OrphanedLiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, orphanedRes] = await Promise.all([
          fetch(API_ENDPOINTS.LIVE_CLASSES.STATS, createFetchOptions("GET")),
          fetch(
            `${API_ENDPOINTS.LIVE_CLASSES.ORPHANED}?page=1&limit=20`,
            createFetchOptions("GET")
          ),
        ]);

        if (!statsRes.ok) {
          throw new Error(`Stats API error: ${statsRes.status}`);
        }
        if (!orphanedRes.ok) {
          throw new Error(`Orphaned API error: ${orphanedRes.status}`);
        }

        const statsJson = await statsRes.json();
        const orphanedJson = await orphanedRes.json();

        if (statsJson.success) {
          setStats(statsJson.data);
        }
        if (orphanedJson.success) {
          setOrphanedClasses(orphanedJson.data.liveClasses || []);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Live Classes Test Page</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Live Classes Test Page</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Live Classes Test Page</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Live Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.withRecordings || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orphaned Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.orphanedCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats?.totalStorageBytes || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recording Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl text-blue-600">
              {stats?.byRecordingStatus?.processing || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl text-green-600">
              {stats?.byRecordingStatus?.ready || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl text-red-600">
              {stats?.byRecordingStatus?.failed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl text-gray-600">
              {stats?.byRecordingStatus?.noRecording || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orphaned Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orphaned Live Classes (First 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {orphanedClasses.length === 0 ? (
            <p className="text-gray-500">No orphaned classes found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recording Status</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphanedClasses.map((lc) => (
                  <TableRow key={lc._id}>
                    <TableCell className="font-medium">{lc.title}</TableCell>
                    <TableCell>{lc.teacherName}</TableCell>
                    <TableCell>{lc.subjectName}</TableCell>
                    <TableCell>
                      {new Date(lc.scheduledAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          lc.recordingStatus === "ready"
                            ? "bg-green-100 text-green-800"
                            : lc.recordingStatus === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : lc.recordingStatus === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {lc.recordingStatus || "none"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lc.recordingSize
                        ? formatBytes(lc.recordingSize)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}