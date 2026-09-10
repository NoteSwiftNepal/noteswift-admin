'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { handleGetDashboardInsights } from '@/app/actions';
import type { DashboardInsightsOutput } from '@/ai/flows/dashboard-insights';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, ListChecks, Sparkles, Terminal, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

const STORAGE_KEY = 'noteswift_dashboard_insights';

export function DashboardInsights() {
  const [insights, setInsights] = useState<DashboardInsightsOutput | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!insights);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        if (insights) return;
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
        if (cached) {
          setInsights(JSON.parse(cached));
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
      }
      setError(null);
      const result = await handleGetDashboardInsights();
      if (result.success && result.insights) {
        setInsights(result.insights);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result.insights));
        }
      } else {
        setError(result.error || 'Failed to load insights.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load insights.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!insights) {
      fetchInsights();
    }
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">AI-Powered Insights</CardTitle>
          </div>
          <CardDescription>AI analysis of your real platform data and performance metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-4/5" />
        </CardContent>
      </Card>
    );
  }

  if (error && !insights) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Insights</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">AI-Powered Insights</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchInsights(true)}
            disabled={isRefreshing}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Your automated data analyst report based on real platform metrics.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground italic">
          &quot;{insights.summary}&quot;
        </p>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><ListChecks /> Key Highlights</h3>
                <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                    {insights.highlights.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
             <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Lightbulb /> Suggestions</h3>
                <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                    {insights.suggestions.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
