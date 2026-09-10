import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { handleGetTaskSuggestions } from "@/app/actions";
import type { TaskSuggestionsOutput } from "@/ai/flows/task-suggestions";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BotMessageSquare, Terminal, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

const STORAGE_KEY = "noteswift_dashboard_task_suggestions";

export function TaskSuggestions() {
  const [suggestions, setSuggestions] = useState<TaskSuggestionsOutput | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!suggestions);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        if (suggestions) return;
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
        if (cached) {
          setSuggestions(JSON.parse(cached));
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
      }
      setError(null);
      const result = await handleGetTaskSuggestions();
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result.suggestions));
        }
      } else {
        setError(result.error || "Failed to load suggestions.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load suggestions.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!suggestions) {
      fetchSuggestions();
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="max-w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">Suggested Tasks</CardTitle>
          </div>
          <CardDescription>
            AI is analyzing your real platform data for actionable tasks...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !suggestions) {
    return (
      <Alert variant="destructive" className="max-w-full">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Suggestions</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!suggestions || suggestions.tasks.length === 0) {
    return (
      <Card className="max-w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BotMessageSquare className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline">Suggested Tasks</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchSuggestions(true)}
              disabled={isRefreshing}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>AI-powered recommendations will appear here based on real platform data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground p-4">
            <p>No immediate tasks to suggest based on current platform data. Great job!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">Suggested Tasks</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSuggestions(true)}
            disabled={isRefreshing}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered recommendations based on real platform data and metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.tasks.map((task, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-muted/50"
          >
            <div className="space-y-1 mb-3 sm:mb-0">
              <h4 className="font-semibold text-sm">{task.title}</h4>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>
            <Button asChild size="sm" className="w-full sm:w-48">
              <Link
                href={task.actionLink}
                className="flex justify-center items-center w-full"
              >
                {task.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
