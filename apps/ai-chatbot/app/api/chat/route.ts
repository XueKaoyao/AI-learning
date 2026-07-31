import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { requireAuth } from '@/app/lib/requireAuth';
import { retrievalTools } from '@/app/tools/retrievalTool';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';

const RAG_SYSTEM_APPENDIX = `先调用 getInformation 工具查询知识库，再回答用户问题。
只依据工具返回的信息作答，不要编造知识库中不存在的内容。
若工具未找到相关内容（count 为 0 或 results 为空），请明确告知用户：知识库中没有相关信息。`;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { messages, temperature, systemPrompt } = await request.json();

    const system = [systemPrompt, RAG_SYSTEM_APPENDIX]
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .join('\n\n');

    const result = streamText({
      model: deepseek(DEEPSEEK_MODEL),
      messages: await convertToModelMessages(messages),
      temperature,
      system,
      tools: retrievalTools,
      stopWhen: stepCountIs(5),
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
