import { prisma } from '@/app/lib/prisma';

/** GET /api/sessions — 获取所有会话 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return new Response('userId is required', { status: 400 });
  }
  const sessions = await prisma.session.findMany({
    where: { userId },
  });
  return new Response(JSON.stringify(sessions), { status: 200 });
}

export async function POST(request: Request) {
  const { userId, title, systemPrompt, temperature } = await request.json();
  if (!userId || !title || !systemPrompt || !temperature) {
    return new Response(
      'userId, title, systemPrompt, and temperature are required',
      { status: 400 },
    );
  }
  const session = await prisma.session.create({
    data: { userId, title, systemPrompt, temperature },
  });
  return new Response(JSON.stringify(session), { status: 200 });
}

export async function PUT(request: Request) {
  const { id, newData } = await request.json();
  if (!id) {
    return new Response('id is required', { status: 400 });
  }
  const session = await prisma.session.update({
    where: { id },
    data: newData,
  });
  return new Response(JSON.stringify(session), { status: 200 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) {
    return new Response('id is required', { status: 400 });
  }
  const session = await prisma.session.delete({
    where: { id },
  });
  return new Response(JSON.stringify(session), { status: 200 });
}
