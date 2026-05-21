import { streamText, convertToModelMessages } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      messages: await convertToModelMessages(messages),
      temperature: 0.8,
      maxRetries: 1,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ text: '请求失败，请稍后再试。' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
