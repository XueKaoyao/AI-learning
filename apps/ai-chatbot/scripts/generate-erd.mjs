/**
 * 从 prisma/schema.prisma 生成 Mermaid ER 图（Windows 友好，不依赖 Unix find / mmdc）。
 *
 * 用法（在 apps/ai-chatbot 下）:
 *   pnpm erd
 *   pnpm erd -- --svg   # 若已安装 @mermaid-js/mermaid-cli，额外导出 ERD.svg
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(APP_ROOT, 'prisma', 'schema.prisma');
const OUT_MD = path.join(APP_ROOT, 'prisma', 'ERD.md');
const OUT_MMD = path.join(APP_ROOT, 'prisma', 'ERD.mmd');
const OUT_SVG = path.join(APP_ROOT, 'prisma', 'ERD.svg');

const PRISMA_TO_MERMAID = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  Boolean: 'Boolean',
  DateTime: 'DateTime',
  Json: 'Json',
  Bytes: 'Bytes',
  BigInt: 'BigInt',
  Decimal: 'Decimal',
};

function stripComments(src) {
  return src
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseModels(schema) {
  const models = [];
  const modelRe = /model\s+(\w+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = modelRe.exec(schema))) {
    const name = m[1];
    const body = m[2];
    const fields = [];
    const relations = [];

    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('@@')) continue;

      // fieldName Type? @attrs
      const fieldMatch = line.match(
        /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/,
      );
      if (!fieldMatch) continue;

      const [, fieldName, typeName, isList, isOptional, rest] = fieldMatch;
      const attrs = rest || '';

      if (/@relation\b/.test(attrs) || (!PRISMA_TO_MERMAID[typeName] && !/^(String|Int|Float|Boolean|DateTime|Json|Bytes|BigInt|Decimal)$/.test(typeName))) {
        // 关系字段：User User @relation(...) 或 messages Message[]
        const relMatch = attrs.match(
          /@relation\s*\(\s*(?:name:\s*"[^"]+"\s*,\s*)?fields:\s*\[([^\]]+)\]\s*,\s*references:\s*\[([^\]]+)\]/,
        );
        if (relMatch) {
          relations.push({
            from: name,
            to: typeName,
            fields: relMatch[1].split(',').map((s) => s.trim()),
            references: relMatch[2].split(',').map((s) => s.trim()),
            list: Boolean(isList),
            optional: Boolean(isOptional),
          });
        } else if (isList) {
          // 反向一对多，不重复画线（由对端 fields/references 画）
        }
        continue;
      }

      const pk = /@id\b/.test(attrs);
      const unique = /@unique\b/.test(attrs);
      fields.push({
        name: fieldName,
        type: typeName + (isList ? '[]' : ''),
        optional: Boolean(isOptional),
        pk,
        unique,
      });
    }

    models.push({ name, fields, relations });
  }
  return models;
}

function toMermaid(models) {
  const lines = ['erDiagram'];

  for (const model of models) {
    lines.push(`  ${model.name} {`);
    for (const f of model.fields) {
      const keys = [];
      if (f.pk) keys.push('PK');
      if (f.unique) keys.push('UK');
      const keyStr = keys.length ? ` ${keys.join(',')}` : '';
      const opt = f.optional ? ' "nullable"' : '';
      lines.push(`    ${f.type} ${f.name}${keyStr}${opt}`);
    }
    lines.push('  }');
  }

  for (const model of models) {
    for (const rel of model.relations) {
      // Child }o--|| Parent  （多对一）
      const left = rel.optional ? '}o' : '}|';
      const right = '||';
      const label = rel.fields.join(',');
      lines.push(
        `  ${rel.from} ${left}--${right} ${rel.to} : "${label}"`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const wantSvg = process.argv.includes('--svg');
  const raw = await readFile(SCHEMA, 'utf8');
  const schema = stripComments(raw);
  const models = parseModels(schema);
  if (models.length === 0) {
    console.error('未解析到任何 model，请检查 schema.prisma');
    process.exit(1);
  }

  const mermaid = toMermaid(models);
  const md = `# Database ERD\n\n\`\`\`mermaid\n${mermaid}\`\`\`\n`;

  await writeFile(OUT_MD, md, 'utf8');
  await writeFile(OUT_MMD, mermaid, 'utf8');
  console.log(`已生成: ${path.relative(APP_ROOT, OUT_MD)}`);
  console.log(`已生成: ${path.relative(APP_ROOT, OUT_MMD)}`);
  console.log(`模型: ${models.map((m) => m.name).join(', ')}`);

  if (!wantSvg) {
    console.log('\n在 VS Code / GitHub 中打开 ERD.md 即可预览。');
    console.log('若要导出 SVG: pnpm erd -- --svg');
    return;
  }

  // pnpm 下用 exec 解析 .bin（Windows 上直接 spawn mmdc.cmd 常失败）
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'mmdc',
      '--',
      '-i',
      OUT_MMD,
      '-o',
      OUT_SVG,
      '-t',
      'neutral',
      '-b',
      'transparent',
    ],
    {
      cwd: APP_ROOT,
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'mmdc 失败');
    console.warn(
      '\n请确认已安装: pnpm add -D @mermaid-js/mermaid-cli',
    );
    console.warn('已保留 ERD.md / ERD.mmd，可先用 Markdown 预览。');
    process.exit(1);
  }
  console.log(`已生成: ${path.relative(APP_ROOT, OUT_SVG)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
