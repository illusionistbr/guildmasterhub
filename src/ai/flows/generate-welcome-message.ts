'use server';

/**
 * @fileOverview AI agent that generates personalized welcome messages for new guild members.
 *
 * - generateWelcomeMessage - A function to generate a welcome message.
 * - GenerateWelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - GenerateWelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWelcomeMessageInputSchema = z.object({
  newMemberName: z.string().describe('The name of the new member joining the guild.'),
  guildName: z.string().describe('The name of the guild.'),
  guildLore: z.string().optional().describe('Optional: The lore of the guild.'),
  guildInJokes: z.string().optional().describe('Optional: Common in-jokes within the guild.'),
});
export type GenerateWelcomeMessageInput = z.infer<typeof GenerateWelcomeMessageInputSchema>;

const GenerateWelcomeMessageOutputSchema = z.object({
  welcomeMessage: z.string().describe('The generated welcome message for the new member.'),
});
export type GenerateWelcomeMessageOutput = z.infer<typeof GenerateWelcomeMessageOutputSchema>;

export async function generateWelcomeMessage(input: GenerateWelcomeMessageInput): Promise<GenerateWelcomeMessageOutput> {
  return generateWelcomeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWelcomeMessagePrompt',
  input: {schema: GenerateWelcomeMessageInputSchema},
  output: {schema: GenerateWelcomeMessageOutputSchema},
  prompt: `You are the official welcoming committee for the {{{guildName}}} guild. Your task is to generate a warm and personalized welcome message for new members.

  New Member Name: {{{newMemberName}}}
  Guild Name: {{{guildName}}}

  Consider the following guild lore and in-jokes to make the message more engaging (if available):
  Guild Lore: {{{guildLore}}}
  Guild In-Jokes: {{{guildInJokes}}}

  Craft a welcome message that makes the new member feel instantly welcomed and integrated into the community. The message should be friendly, inviting, and reflect the unique personality of the guild. If guild lore and in-jokes are present, creatively incorporate them to enhance the sense of belonging. If the guild lore and in-jokes are not present, create a generic, but very warm, welcome message.
  Ensure that the message is appropriate and respectful.
  `,
});

const generateWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'generateWelcomeMessageFlow',
    inputSchema: GenerateWelcomeMessageInputSchema,
    outputSchema: GenerateWelcomeMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
