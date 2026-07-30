import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;

/** 将明文密码哈希为 `salt:hash`（hex） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

/** 校验明文密码与存储的 `salt:hash` */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [salt, storedHex] = passwordHash.split(':');
  if (!salt || !storedHex) return false;

  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  const stored = Buffer.from(storedHex, 'hex');
  if (stored.length !== derived.length) return false;

  return timingSafeEqual(stored, derived);
}

/** 对外返回的用户信息（不含密码） */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

/**
 * 简易会话 token：`userId.signature`
 * 生产环境应换成 JWT / 正式 session；此处满足客户端 Bearer 鉴权挂载。
 */
export function createSessionToken(userId: string): string {
  const secret = process.env.AUTH_SECRET ?? 'dev-auth-secret';
  const signature = createHash('sha256')
    .update(`${userId}.${secret}`)
    .digest('hex');
  return `${userId}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  const [userId, signature] = token.split('.');
  if (!userId || !signature) return null;

  const expected = createSessionToken(userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return userId;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterInput(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}): string | null {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!name) return '用户名不能为空';
  if (!email) return '邮箱不能为空';
  if (!EMAIL_RE.test(email)) return '邮箱格式不正确';
  if (!password) return '密码不能为空';
  if (password.length < 8) return '密码长度至少为 8 位';

  return null;
}

export function validateLoginInput(input: {
  email?: unknown;
  password?: unknown;
}): string | null {
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email) return 'email is required';
  if (!EMAIL_RE.test(email)) return 'email format is invalid';
  if (!password) return 'password is required';

  return null;
}
