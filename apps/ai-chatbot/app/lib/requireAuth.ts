import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  toPublicUser,
  verifySessionToken,
  type PublicUser,
} from '@/app/lib/auth';

type AuthSuccess = { ok: true; user: PublicUser };
type AuthFailure = { ok: false; response: Response };

export type AuthResult = AuthSuccess | AuthFailure;

function unauthorized(): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json(
      { message: '登录已过期，请重新登录' },
      { status: 401 },
    ),
  };
}

/** 校验 Authorization Bearer token，成功时返回当前用户 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) return unauthorized();

  const userId = verifySessionToken(token);
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();

  return { ok: true, user: toPublicUser(user) };
}
