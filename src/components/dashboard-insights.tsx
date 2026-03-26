'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { handleGetDashboardInsights } from '@/app/actions';
import type { DashboardInsightsOutput } from '@/ai/flows/dashboard-insights';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, ListChecks, Sparkles, Terminal } from 'lucide-react';

export function DashboardInsights() {
  const [insights, setInsights] = useState<DashboardInsightsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      const result = await handleGetDashboardInsights();
      if (result.success && result.insights) {
        setInsights(result.insights);
      } else {
        setError(result.error || 'Failed to load insights.');
      }
      setIsLoading(false);
    };

    fetchInsights();
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

  if (error) {
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
        <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">AI-Powered Insights</CardTitle>
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
