'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, Users, TrendingUp, Play, Pause, Settings, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Course {
  _id: string;
  title: string;
  status: string;
  type: string;
  program: string;
  updatedAt?: string;
  createdAt?: string;
  recommendationData?: {
    targetGrades: string[];
    targetAudience: string;
    difficultyLevel: string;
    recommendedFor: string[];
    confidence: number;
    lastAnalyzed: Date;
  };
}

interface RecommendationStats {
  totalCourses: number;
  analyzedCourses: number;
  gradeDistribution: string[][];
}

export default function RecommendationsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingCourses, setAnalyzingCourses] = useState<Set<string>>(new Set());
  const [recommendationMode, setRecommendationMode] = useState<'auto' | 'manual' | 'off'>(() => {
    // Load saved preference from localStorage, default to 'off'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recommendationMode');
      return (saved as 'auto' | 'manual' | 'off') || 'off';
    }
    return 'off';
  });
  const [lastCourseUpdate, setLastCourseUpdate] = useState<Date | null>(null);
  const autoAnalyzedRef = useRef(false);
  const courseCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, []);

  // Save recommendation mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('recommendationMode', recommendationMode);
  }, [recommendationMode]);

  useEffect(() => {
    // Auto-analyze all courses when mode is set to 'auto' (only once per mode change)
    if (recommendationMode === 'auto' && !autoAnalyzedRef.current) {
      autoAnalyzedRef.current = true;
      handleAutoAnalyzeAll();
    } else if (recommendationMode !== 'auto') {
      autoAnalyzedRef.current = false;
    }
  }, [recommendationMode]);

  useEffect(() => {
    // Set up course change monitoring when in auto mode
    if (recommendationMode === 'auto') {
      startCourseMonitoring();
    } else {
      stopCourseMonitoring();
    }

    return () => stopCourseMonitoring();
  }, [recommendationMode]);

  const startCourseMonitoring = () => {
    // Check for course changes every 30 seconds
    courseCheckIntervalRef.current = setInterval(async () => {
      try {
        const since = lastCourseUpdate ? lastCourseUpdate.toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
          const response = await fetch(`/api/recommendations/course-changes?since=${encodeURIComponent(since)}`);
        const data = await response.json();

        if (data.success && data.data.hasChanges) {
          console.log(`Course changes detected: ${data.data.totalChanged} courses changed`);
          await handleAutoAnalyzeChangedCourses(data.data.changedCourses);
        }
      } catch (error) {
        console.error('Error checking for course changes:', error);
      }
    }, 30000); // Check every 30 seconds
  };

  const stopCourseMonitoring = () => {
    if (courseCheckIntervalRef.current) {
      clearInterval(courseCheckIntervalRef.current);
      courseCheckIntervalRef.current = null;
    }
  };

  const handleAutoAnalyzeChangedCourses = async (changedCourses: any[]) => {
    if (changedCourses.length === 0) return;

    console.log(`Auto-analyzing ${changedCourses.length} changed/new courses...`);

    // Update last course update timestamp
    const latestUpdate = Math.max(...changedCourses.map(c => new Date(c.updatedAt).getTime()));
    setLastCourseUpdate(new Date(latestUpdate));

    // Analyze changed courses
    const analyzePromises = changedCourses.map(course => analyzeCourse(course._id, 'auto'));
    await Promise.all(analyzePromises);

    toast({
      title: "Auto Analysis Complete",
      description: `Automatically analyzed ${changedCourses.length} updated courses.`,
    });
  };

  const fetchCourses = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.COURSES.LIST, createFetchOptions('GET'));
      const data = await response.json();
      if (data.success) {
        setCourses(data.result.courses);
        // Update last course update timestamp
        const latestUpdate = Math.max(...data.result.courses.map((c: Course) => new Date(c.updatedAt || c.createdAt || 0).getTime()));
        setLastCourseUpdate(new Date(latestUpdate));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS.STATS, createFetchOptions('GET'));
      const data = await response.json();
      if (data.success) {
        setStats(data.result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const analyzeCourse = async (courseId: string, mode: 'auto' | 'manual' = 'auto') => {
    // In auto mode, individual analysis is disabled
    if (recommendationMode === 'auto' && mode !== 'auto') {
      return;
    }

    setAnalyzingCourses(prev => new Set(prev).add(courseId));
    setLoading(true);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS.ANALYZE, 
        createFetchOptions('POST', { courseId, mode })
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Analysis Complete",
          description: `Course recommendations updated successfully.`,
        });
        fetchCourses();
        fetchStats();
      } else {
        toast({
          title: "Analysis Failed",
          description: data.error || "Failed to analyze course",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze course",
        variant: "destructive",
      });
    } finally {
      setAnalyzingCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      setLoading(false);
    }
  };

  const handleAutoAnalyzeAll = async () => {
    if (recommendationMode !== 'auto') return;

    setLoading(true);
    const unanalyzedCourses = courses.filter(course => !course.recommendationData);

    // Start analyzing all unanalyzed courses
    const analyzePromises = unanalyzedCourses.map(course => analyzeCourse(course._id, 'auto'));
    await Promise.all(analyzePromises);

    setLoading(false);
    toast({
      title: "Auto Analysis Complete",
      description: `Analyzed ${unanalyzedCourses.length} courses automatically.`,
    });
  };

  const analyzeAllCourses = async () => {
    setLoading(true);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS.ANALYZE_ALL, 
        createFetchOptions('POST')
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Batch Analysis Complete",
          description: data.message,
        });
        fetchCourses();
        fetchStats();
      } else {
        toast({
          title: "Analysis Failed",
          description: data.message || "Failed to analyze courses",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzedPercentage = stats ? (stats.analyzedCourses / stats.totalCourses) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">AI Course Recommendations</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Automatically analyze courses and provide personalized recommendations to students</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={recommendationMode} onValueChange={(value: any) => setRecommendationMode(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Manual Only</SelectItem>
              <SelectItem value="auto">Auto Analyze</SelectItem>
              <SelectItem value="manual">Manual Override</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={analyzeAllCourses}
            disabled={loading || analyzedPercentage === 100 || recommendationMode !== 'manual'}
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Analyze All Courses
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analysis Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.analyzedCourses || 0}/{stats?.totalCourses || 0}</div>
            <Progress value={analyzedPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analyzedPercentage.toFixed(1)}% of courses analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recommendations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recommendationMode === 'auto' ? 'AUTO' : recommendationMode === 'manual' ? 'MANUAL' : 'OFF'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {recommendationMode === 'auto' ? 'Monitoring for course changes' :
               recommendationMode === 'manual' ? 'Manual control enabled' : 'Recommendations disabled'}
            </p>
            {recommendationMode === 'auto' && (
              <div className="flex items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Active monitoring</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">High</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average confidence: 85%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Analysis Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Analysis Status</TableHead>
                <TableHead>Target Grades</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course._id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>
                    <Badge variant={course.status === 'Published' ? 'default' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {course.recommendationData ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Analyzed
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {course.recommendationData.confidence ? `${(course.recommendationData.confidence * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not Analyzed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {course.recommendationData?.targetGrades?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {course.recommendationData.targetGrades.slice(0, 2).map((grade) => (
                          <Badge key={grade} variant="outline" className="text-xs">
                            {grade}
                          </Badge>
                        ))}
                        {course.recommendationData.targetGrades.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{course.recommendationData.targetGrades.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzeCourse(course._id, 'manual')}
                      disabled={analyzingCourses.has(course._id) || loading || recommendationMode === 'auto'}
                    >
                      {analyzingCourses.has(course._id) ? (
                        <>
                          <Brain className="w-3 h-3 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : course.recommendationData ? (
                        <>
                          <Brain className="w-3 h-3 mr-1" />
                          Re-analyze
                        </>
                      ) : (
                        <>
                          <Brain className="w-3 h-3 mr-1" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}