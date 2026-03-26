'use server';

/**
 * @fileOverview AI-powered content tagging flow.
 *
 * - suggestTags - A function that suggests relevant tags for educational content.
 * - ContentTaggingInput - The input type for the suggestTags function.
 * - ContentTaggingOutput - The return type for the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentTaggingInputSchema = z.object({
  contentDescription: z
    .string()
    .describe('A description of the educational content.'),
});
export type ContentTaggingInput = z.infer<typeof ContentTaggingInputSchema>;

const ContentTaggingOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of suggested tags for the content.'),
});
export type ContentTaggingOutput = z.infer<typeof ContentTaggingOutputSchema>;

export async function suggestTags(input: ContentTaggingInput): Promise<ContentTaggingOutput> {
  return contentTaggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentTaggingPrompt',
  input: {schema: ContentTaggingInputSchema},
  output: {schema: ContentTaggingOutputSchema},
  prompt: `You are an AI expert in content tagging for educational materials.
  Based on the content description provided, suggest relevant tags to improve searchability for students.
  Return ONLY an array of strings.

  Content Description: {{{contentDescription}}}
  `,
});

const contentTaggingFlow = ai.defineFlow(
  {
    name: 'contentTaggingFlow',
    inputSchema: ContentTaggingInputSchema,
    outputSchema: ContentTaggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
