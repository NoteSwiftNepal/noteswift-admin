'use server';

/**
 * AI-powered dashboard insights flow.
 *
 * Features:
 * - Modular prompt with clear formatting and instructions
 * - Validated input/output schemas using zod
 * - Friendly, positive, and actionable output format
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema defining dashboard metrics expected
const DashboardInsightsInputSchema = z.object({
  totalUsers: z.number().min(0).describe('Total number of users on the platform'),
  activeUsersToday: z.number().min(0).describe('Number of users active in the last 24 hours'),
  newSignupsLastWeek: z.number().min(0).describe('New user sign-ups in the last 7 days'),
  coursesPublished: z.number().min(0).describe('Total number of published courses'),
  topCourses: z
    .array(
      z.object({
        name: z.string().min(1),
        engagement: z.number().min(0),
      }),
    )
    .describe('List of top courses with their engagement scores'),
});
export type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

// Output schema defining the structure of AI-generated insights
const DashboardInsightsOutputSchema = z.object({
  summary: z.string().min(10).describe('Brief positive summary paragraph about dashboard data'),
  highlights: z
    .array(z.string().min(5))
    .min(2)
    .max(3)
    .describe('2-3 key highlights or trends from the data'),
  suggestions: z
    .array(z.string().min(5))
    .min(2)
    .max(3)
    .describe('2-3 actionable suggestions for the admin'),
});
export type DashboardInsightsOutput = z.infer<typeof DashboardInsightsOutputSchema>;

/**
 * The prompt template, defined cleanly with handlebars-style placeholders.
 * Instructions emphasize clarity, positivity, and actionable insights.
 */
const dashboardInsightsPrompt = ai.definePrompt({
  name: 'dashboardInsightsPrompt',
  input: { schema: DashboardInsightsInputSchema },
  output: { schema: DashboardInsightsOutputSchema },
  prompt: `
You are a friendly and insightful data analyst for NoteSwift, an educational platform. Your task is to analyze the following dashboard metrics and generate a clear, concise, and actionable insights report for the admin.

- Use a positive and encouraging tone.
- Provide:
  1. A brief summary paragraph of the dashboard data.
  2. 2-3 key highlights or notable trends as complete sentences.
  3. 2-3 actionable suggestions for the admin with rationale.

Dashboard Metrics:

Total Users: {{totalUsers}}
Active Users Today: {{activeUsersToday}}
New Signups (Last 7 Days): {{newSignupsLastWeek}}
Courses Published: {{coursesPublished}}

Top Courses by Engagement:
{{#each topCourses}}
- {{name}}: Engagement Score {{engagement}}
{{/each}}

Please format the output as a JSON object with keys: summary, highlights (array), suggestions (array).
`,
});

/**
 * Main AI flow function.
 * Validates input, calls AI prompt, validates output, and returns insights.
 */
export async function getDashboardInsights(
  input: DashboardInsightsInput,
): Promise<DashboardInsightsOutput> {
  // Validate input strictly before calling AI
  DashboardInsightsInputSchema.parse(input);

  // Call AI prompt
  const { output } = await dashboardInsightsPrompt(input);

  // Validate AI output before returning
  const parsedOutput = DashboardInsightsOutputSchema.parse(output);

  return parsedOutput;
}
