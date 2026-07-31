/**
 * 对聊天相关 SQL 跑 EXPLAIN (ANALYZE, BUFFERS)。
 *
 * 用法（在 apps/ai-chatbot 下）:
 *   pnpm explain:queries
 *   pnpm explain:queries -- --userId cmsxxx
 *   pnpm explain:queries -- --sessionId cmsyyy
 *   pnpm explain:queries -- --userId cmsxxx --sessionId cmsyyy
 *
 * 需要环境变量 DATABASE_URL（与 Prisma 相同）。
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

function argValue(argv, name) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  return argv[idx + 1] ?? null;
}

function printPlan(title, rows) {
  console.log(`\n======= ${title} =======`);
  if (!rows?.length) {
    console.log('(无输出)');
    return;
  }
  for (const row of rows) {
    // pg 返回 { 'QUERY PLAN': '...' }
    const line = row['QUERY PLAN'] ?? Object.values(row)[0];
    console.log(line);
  }
}

async function explain(client, title, sql, params = []) {
  const { rows } = await client.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`,
    params,
  );
  printPlan(title, rows);
}

async function main() {
  const argv = process.argv.slice(2);
  let userId = argValue(argv, '--userId');
  let sessionId = argValue(argv, '--sessionId');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (!userId) {
      const { rows } = await client.query(
        `SELECT id FROM "User" ORDER BY "createdAt" DESC LIMIT 1`,
      );
      userId = rows[0]?.id ?? null;
    }
    if (!sessionId) {
      const { rows } = await client.query(
        userId
          ? `SELECT id FROM "Session" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`
          : `SELECT id FROM "Session" ORDER BY "createdAt" DESC LIMIT 1`,
        userId ? [userId] : [],
      );
      sessionId = rows[0]?.id ?? null;
    }

    console.log('DATABASE_URL:', connectionString.replace(/:[^:@/]+@/, ':***@'));
    console.log('userId:', userId ?? '(无用户，跳过相关查询)');
    console.log('sessionId:', sessionId ?? '(无会话，跳过相关查询)');

    // 表行数概览
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "User") AS users,
        (SELECT COUNT(*)::int FROM "Session") AS sessions,
        (SELECT COUNT(*)::int FROM "Message") AS messages
    `);
    console.log('行数:', counts.rows[0]);

    if (userId) {
      await explain(
        client,
        'Session WHERE userId = $1（侧边栏列表）',
        `SELECT * FROM "Session" WHERE "userId" = $1`,
        [userId],
      );
    }

    if (sessionId) {
      await explain(
        client,
        'Session WHERE id = $1',
        `SELECT * FROM "Session" WHERE "id" = $1`,
        [sessionId],
      );
      await explain(
        client,
        'Message WHERE sessionId = $1 ORDER BY createdAt（切换会话拉消息）',
        `SELECT * FROM "Message" WHERE "sessionId" = $1 ORDER BY "createdAt" ASC`,
        [sessionId],
      );
      await explain(
        client,
        'Session + Message JOIN（接近 Prisma include messages）',
        `SELECT s.*, m.id AS message_id, m.role, m."createdAt" AS message_created_at
         FROM "Session" s
         LEFT JOIN "Message" m ON m."sessionId" = s.id
         WHERE s.id = $1
         ORDER BY m."createdAt" ASC`,
        [sessionId],
      );
    }

    // 索引一览
    const indexes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('User', 'Session', 'Message')
      ORDER BY tablename, indexname
    `);
    console.log('\n======= 相关索引 =======');
    for (const row of indexes.rows) {
      console.log(`${row.tablename}.${row.indexname}`);
      console.log(`  ${row.indexdef}`);
    }

    console.log('\n解读提示: Seq Scan=全表扫；Index Scan/Index Only Scan=走索引；关注 actual time 与 rows。');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
