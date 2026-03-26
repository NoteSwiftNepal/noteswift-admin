'use server';

/**
 * @fileOverview AI-powered course recommendation analysis flow.
 *
 * - analyzeCourseForRecommendations - A function that analyzes course content to extract recommendation metadata.
 * - CourseRecommendationInput - The input type for the analysis function.
 * - CourseRecommendationOutput - The return type for the analysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CourseRecommendationInputSchema = z.object({
  title: z.string().describe('The course title'),
  description: z.string().describe('The course description'),
  subjects: z.array(z.object({
    name: z.string(),
    description: z.string().optional()
  })).optional().describe('Course subjects/modules'),
  tags: z.array(z.string()).optional().describe('Existing course tags'),
  program: z.string().describe('Target program (SEE, +2, Bachelor, CTEVT)'),
});
export type CourseRecommendationInput = z.infer<typeof CourseRecommendationInputSchema>;

const CourseRecommendationOutputSchema = z.object({
  targetGrades: z.array(z.string()).describe('Grade levels this course is suitable for (e.g., ["Grade 10", "Grade 11", "Grade 12"])'),
  targetAudience: z.string().describe('Description of who this course is best suited for'),
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).describe('Course difficulty level'),
  recommendedFor: z.array(z.string()).describe('Specific recommendations (e.g., ["Students preparing for board exams", "Students interested in science"])'),
  confidence: z.number().min(0).max(1).describe('AI confidence score for the analysis'),
});
export type CourseRecommendationOutput = z.infer<typeof CourseRecommendationOutputSchema>;

export async function analyzeCourseForRecommendations(input: CourseRecommendationInput): Promise<CourseRecommendationOutput> {
  return courseRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'courseRecommendationPrompt',
  input: {schema: CourseRecommendationInputSchema},
  output: {schema: CourseRecommendationOutputSchema},
  prompt: `You are an expert educational consultant specializing in course recommendations for Nepalese students.

Analyze the course content and determine:
1. Target grade levels (based on Nepalese education system: SEE, +2, Bachelor, etc.)
2. Who this course is best suited for
3. Difficulty level
4. Specific recommendations for students

Course Title: {{{title}}}
Course Description: {{{description}}}
Program: {{{program}}}
Subjects/Modules: {{{subjects}}}
Existing Tags: {{{tags}}}

Based on the Nepalese education system, provide accurate grade-level targeting.
Return a confidence score between 0-1 indicating how certain you are about the analysis.
`,
});

const courseRecommendationFlow = ai.defineFlow(
  {
    name: 'courseRecommendationFlow',
    inputSchema: CourseRecommendationInputSchema,
    outputSchema: CourseRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);