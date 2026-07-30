import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/** GET /api/sessions/[id] — 获取指定会话的消息列表 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!session) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}

/** POST /api/sessions/[id] — 创建消息（单条或批量，message.id 由前端生成）
 * body 单条: { id, parts, role }
 * body 批量: { messages: [{ id, parts, role }, ...] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 });
  }

  const body = await request.json();
  const inputs: { id: string; parts: unknown; role: string }[] = Array.isArray(
    body?.messages,
  )
    ? body.messages
    : body?.id && body?.parts && body?.role
      ? [body]
      : [];

  if (inputs.length === 0) {
    return NextResponse.json(
      {
        message:
          'Provide { id, parts, role } or { messages: [{ id, parts, role }, ...] }',
      },
      { status: 400 },
    );
  }

  for (const item of inputs) {
    if (!item?.id || !item?.parts || !item?.role) {
      return NextResponse.json(
        { message: 'each message requires id, parts and role' },
        { status: 400 },
      );
    }
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  }

  const created = await prisma.message.createManyAndReturn({
    data: inputs.map((item) => ({
      id: item.id,
      parts: item.parts as object[],
      role: item.role,
      sessionId,
    })),
  });

  // 单条保持原返回形态；批量返回数组
  return NextResponse.json(created.length === 1 ? created[0] : created);
}

/** PUT /api/sessions/[id] — 更新指定会话的消息 */
export async function PUT(request: Request) {
  const { id, parts, role } = await request.json();
  if (!id || !parts || !role) {
    return NextResponse.json(
      { message: 'id, parts and role are required' },
      { status: 400 },
    );
  }
  const message = await prisma.message.findUnique({
    where: { id },
  });
  if (!message) {
    return NextResponse.json({ message: 'Message not found' }, { status: 404 });
  }
  const updatedMessage = await prisma.message.update({
    where: { id },
    data: { parts, role },
  });
  return new Response(JSON.stringify(updatedMessage), { status: 200 });
}

/** DELETE /api/sessions/[id] — 删除指定会话的消息 */
export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) {
    return new Response('id is required', { status: 400 });
  }
  const message = await prisma.message.delete({
    where: { id },
  });
  return new Response(JSON.stringify(message), { status: 200 });
}
