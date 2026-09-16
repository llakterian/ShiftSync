import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { getAvailableStaffTool, checkOvertimeRisksTool } from '@/lib/ai/tools';

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby

const nvidia = createOpenAI({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: nvidia.chat('z-ai/glm-5.3-flash'),
    system: `You are the Coastal Eats Shift Manager Smart Assist.
    You help Coastal Eats restaurant managers efficiently schedule staff, find coverage for call-outs,
    and avoid overtime violations across all four locations.
    Always use the provided tools to fetch real data before answering.
    If you do not know the location ID, ask the user to clarify which location they are asking about.`,
    messages: await convertToModelMessages(messages),
    tools: {
      getAvailableStaff: getAvailableStaffTool,
      checkOvertimeRisks: checkOvertimeRisksTool,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
