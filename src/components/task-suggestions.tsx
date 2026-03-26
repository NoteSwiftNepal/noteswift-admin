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
import { BotMessageSquare, Terminal, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

export function TaskSuggestions() {
  const [suggestions, setSuggestions] = useState<TaskSuggestionsOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);
      const result = await handleGetTaskSuggestions();
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setError(result.error || "Failed to load suggestions.");
      }
      setIsLoading(false);
    };

    fetchSuggestions();
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

  if (error) {
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
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">Suggested Tasks</CardTitle>
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
        <div className="flex items-center gap-2">
          <BotMessageSquare className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline">Suggested Tasks</CardTitle>
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
