'use server';

/**
 * AI-powered task suggestion flow.
 *
 * Features:
 * - Validated inputs/outputs with zod
 * - Clear and precise prompt instructions
 * - Conditional task generation based on counts
 * - Well-structured task objects with actionable labels and links
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema with counts for inactive users, unreviewed content, and failed payments
const TaskSuggestionsInputSchema = z.object({
  inactiveUserCount: z.number().min(0).describe('Users inactive for over 30 days'),
  unreviewedContentCount: z.number().min(0).describe('Newly uploaded content pending review'),
  failedPaymentsCount: z.number().min(0).describe('Failed payment transactions in last 7 days'),
});
export type TaskSuggestionsInput = z.infer<typeof TaskSuggestionsInputSchema>;

// Schema for each suggested task: title, description, action label and link
const TaskSuggestionSchema = z.object({
  title: z.string().describe('A short, actionable title for the task.'),
  description: z.string().describe('A brief explanation of why this task is suggested.'),
  actionLabel: z.string().describe('A label for the action button, e.g., "View Users".'),
  actionLink: z.string().describe('The relevant dashboard page link for the action, e.g., "/dashboard/users".'),
});

// Output schema: an array of task suggestions
const TaskSuggestionsOutputSchema = z.object({
  tasks: z.array(TaskSuggestionSchema).describe('An array of suggested admin tasks.'),
});

export type TaskSuggestionsOutput = z.infer<typeof TaskSuggestionsOutputSchema>;

/**
 * The prompt template:
 * - Explains role clearly
 * - Specifies to only generate tasks where count > 0
 * - Requires all fields for each task
 * - Requests output as a JSON object for reliable parsing
 */
const taskSuggestionsPrompt = ai.definePrompt({
  name: 'taskSuggestionsPrompt',
  input: { schema: TaskSuggestionsInputSchema },
  output: { schema: TaskSuggestionsOutputSchema },
  prompt: `
You are an AI assistant helping the admin of NoteSwift.

Data:
- Inactive Users: {{inactiveUserCount}}
- Unreviewed Content: {{unreviewedContentCount}}
- Failed Payments: {{failedPaymentsCount}}

Suggest actionable tasks only if count > 0.

Output JSON:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "actionLabel": "string",
      "actionLink": "string"
    }
  ]
}
`,
});


/**
 * Main flow function:
 * - validates input/output
 * - calls AI prompt
 * - returns parsed, validated task suggestions
 */
export async function getTaskSuggestions(
  input: TaskSuggestionsInput,
): Promise<TaskSuggestionsOutput> {
  // Validate input
  TaskSuggestionsInputSchema.parse(input);

  // Call AI prompt
  const { output } = await taskSuggestionsPrompt(input);

  // Validate and parse AI output
  return TaskSuggestionsOutputSchema.parse(output);
}
