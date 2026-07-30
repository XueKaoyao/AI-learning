import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  createSessionToken,
  hashPassword,
  toPublicUser,
  validateLoginInput,
  validateRegisterInput,
  verifyPassword,
  verifySessionToken,
} from '@/app/lib/auth';

/** GET /api/user — 根据 Authorization Bearer token 返回当前用户 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(toPublicUser(user));
}

/** POST /api/user — 注册新用户 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationError = validateRegisterInput(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const name = String(body.name).trim();
    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('该邮箱已注册');
      return NextResponse.json({ message: '该邮箱已注册' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = createSessionToken(user.id);
    return NextResponse.json(
      { user: toPublicUser(user), token },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ message: '注册失败' }, { status: 500 });
  }
}

/** PUT /api/user — 登录 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validationError = validateLoginInput(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: '用户不存在或邮箱错误' },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: '邮箱或密码错误' }, { status: 401 });
    }

    const token = createSessionToken(user.id);
    return NextResponse.json({ user: toPublicUser(user), token });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ message: '登录失败' }, { status: 500 });
  }
}
