/**
 * 调用 documents API 删除数据库中的 Document。
 *
 * 用法（先启动 next dev）:
 *   pnpm delete:docs -- --id <uuid>
 *   pnpm delete:docs -- --ids <uuid1> <uuid2>
 *   pnpm delete:docs -- --all
 *
 * 可选环境变量:
 *   DOCUMENTS_API_URL  默认 http://localhost:3000/api/documents
 */

const DOCUMENTS_API_URL =
  process.env.DOCUMENTS_API_URL ?? 'http://localhost:3000/api/documents';

function parseArgs(argv) {
  if (argv.includes('--all')) {
    return { all: true };
  }

  const idIdx = argv.indexOf('--id');
  if (idIdx !== -1) {
    const id = argv[idIdx + 1];
    if (!id || id.startsWith('-')) {
      throw new Error('用法: pnpm delete:docs -- --id <uuid>');
    }
    return { id };
  }

  const idsIdx = argv.indexOf('--ids');
  if (idsIdx !== -1) {
    const ids = argv.slice(idsIdx + 1).filter((v) => !v.startsWith('-'));
    if (ids.length === 0) {
      throw new Error('用法: pnpm delete:docs -- --ids <uuid1> <uuid2> ...');
    }
    return { ids };
  }

  throw new Error(
    [
      '用法:',
      '  pnpm delete:docs -- --id <uuid>',
      '  pnpm delete:docs -- --ids <uuid1> <uuid2>',
      '  pnpm delete:docs -- --all',
    ].join('\n'),
  );
}

async function main() {
  let body;
  try {
    body = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log(`删除接口: ${DOCUMENTS_API_URL}`);
  console.log('请求体:', body);

  let response;
  try {
    response = await fetch(DOCUMENTS_API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(
      '\n请求失败，请确认 Next.js 已启动:\n',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`\n删除失败 HTTP ${response.status}:`, payload);
    process.exit(1);
  }

  if (payload.document) {
    console.log(`\n已删除: ${payload.document.id}  ${payload.document.title}`);
  } else {
    console.log(`\n已删除 ${payload.deleted ?? 0} 条`);
  }
}

main();
