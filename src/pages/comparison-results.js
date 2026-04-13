// ===== SEOGEO4YMYL — Comparison Results Page (v2) =====
// Side-by-side matrix: My Page vs Competitor 1 vs Competitor 2 ...
// Uses the exact NormalizedPageData structure from core/parser.js

import { getLlmConfig, streamContent } from '../core/engine/llm-orchestrator.js';
import { esc } from '../utils/html-escape.js';

// ── Field extraction (maps exactly to parser.js output) ───────────────────────
function extractFields(url, pageData) {
  const d = pageData || {};

  const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();

  // ─ Meta (parser.js: pageData.meta) ─────────────────────────────────────────
  const meta         = d.meta || {};
  const title        = meta.title        || '';
  const titleLen     = meta.titleLength  || title.length;
  const description  = meta.description  || '';
  const descLen      = meta.descriptionLength || description.length;
  const canonical    = meta.canonical    || '';
  const lang         = meta.lang         || '';
  const hasOg        = !!(meta.ogTitle && meta.ogDescription);
  const hasOgImage   = !!meta.ogImage;
  const hasTwitter   = !!meta.twitterCard;
  const robotsMeta   = meta.robots       || '';

  // ─ Headings (parser.js: pageData.headings) ─────────────────────────────────
  const headings     = d.headings || {};
  const h1s          = headings.h1 || [];
  const h1           = h1s[0] || '';
  const h1Count      = h1s.length;
  const h2Count      = (headings.h2 || []).length;
  const h3Count      = (headings.h3 || []).length;

  // ─ Content (parser.js: pageData.content) ───────────────────────────────────
  const content      = d.content || {};
  const wordCount    = content.wordCount  || 0;
  const atomicCount  = (content.atomicAnswers || []).length;

  // ─ DOM Structure (parser.js: pageData.structure) ───────────────────────────
  const structure    = d.structure || {};
  const hasFaq       = structure.hasFaq   || false;
  const hasTable     = structure.hasTable || false;
  const hasList      = structure.hasList  || false;

  // ─ Links (parser.js: pageData.links) ───────────────────────────────────────
  const links        = d.links || [];
  const internalLinks= links.filter(l => l.isInternal && l.context !== 'nav' && l.context !== 'footer').length;
  const externalLinks= links.filter(l => !l.isInternal).length;

  // ─ Images (parser.js: pageData.images) ────────────────────────────────────
  const images       = d.images || [];
  const imageCount   = images.length;
  const imgWithAlt   = images.filter(i => i.alt && i.alt.trim().length > 0).length;
  const altCoverage  = imageCount > 0 ? Math.round((imgWithAlt / imageCount) * 100) : null;

  // ─ Schema (parser.js: pageData.schemas) ────────────────────────────────────
  const schemas      = d.schemas || [];
  const schemaTypes  = [...new Set(schemas.map(s => s['@type']).filter(Boolean))];
  const hasSchema    = schemaTypes.length > 0;
  const hasFaqSchema = schemas.some(s => s['@type'] === 'FAQPage');
  const hasOrgSchema = schemas.some(s => s['@type'] === 'Organization');
  const hasPersonSchema = schemas.some(s => s['@type'] === 'Person');

  // ─ Technical ───────────────────────────────────────────────────────────────
  const isHttps      = d.security?.isHttps ?? url.startsWith('https');
  const htmlSize     = d.performance?.htmlSize || 0;    // bytes

  // ─ robots.txt / sitemap / llms.txt (enriched via fetchSiteResources) ───────
  const hasSitemap   = !!(d.sitemap);
  const hasLlmsTxt   = !!(d.llmsTxt);

  // robots.txt: detect AI crawler blocks
  const aiBlocked    = d.robots?.aiCrawlerPolicies?.filter(p => p.isBlocked).map(p => p.crawler) || [];
  const hasRobots    = !!(d.robots);

  return {
    url, hostname,
    // meta
    title, titleLen,
    description, descLen,
    canonical, lang,
    hasOg, hasOgImage, hasTwitter,
    robotsMeta,
    // headings
    h1, h1Count, h2Count, h3Count,
    // content
    wordCount, atomicCount, hasFaq,
    // links
    internalLinks, externalLinks,
    // images
    imageCount, imgWithAlt, altCoverage,
    // schema
    schemaTypes, hasSchema, hasFaqSchema, hasOrgSchema, hasPersonSchema,
    // technical
    isHttps, htmlSize,
    // robots/sitemap/llms
    hasRobots, hasSitemap, hasLlmsTxt,
    aiBlocked,
  };
}

// ── Field spec ────────────────────────────────────────────────────────────────
const FIELDS = [
  // ── On-Page ──
  {
    key: 'titleLen', label: 'Title 长度', category: '📄 On-Page',
    render(val, isMe, all, row) {
      if (!row.title) return { value: '❌ Title 缺失', status: 'fail' };
      const status = val > 60 ? 'warn' : val >= 30 ? 'pass' : 'warn';
      const min = Math.min(...all.filter(v => v > 0));
      return { value: `${val} 字符${val > 60 ? ' ⚠️过长' : ''}`, status };
    },
  },
  {
    key: 'title', label: 'Title 内容', category: '📄 On-Page',
    render(val) {
      if (!val) return { value: '❌ 缺失', status: 'fail' };
      return { value: `"${val.slice(0, 45)}${val.length > 45 ? '…' : ''}"`, status: 'info' };
    },
  },
  {
    key: 'descLen', label: 'Meta Desc 长度', category: '📄 On-Page',
    render(val, isMe, all, row) {
      if (!row.description) return { value: '❌ Meta Desc 缺失', status: 'fail' };
      const status = val > 160 ? 'warn' : val >= 80 ? 'pass' : 'warn';
      return { value: `${val} 字符${val > 160 ? ' ⚠️过长' : ''}`, status };
    },
  },
  {
    key: 'description', label: 'Meta Desc 内容', category: '📄 On-Page',
    render(val) {
      if (!val) return { value: '❌ 缺失', status: 'fail' };
      return { value: `"${val.slice(0, 55)}${val.length > 55 ? '…' : ''}"`, status: 'info' };
    },
  },
  {
    key: 'h1Count', label: 'H1 数量', category: '📄 On-Page',
    render(val, isMe, all, row) {
      if (val === 0) return { value: '❌ 0（缺失）', status: 'fail' };
      if (val > 1)   return { value: `⚠️ ${val} 个（应只有1个）`, status: 'warn' };
      return { value: `✅ 1 个`, status: 'pass' };
    },
  },
  {
    key: 'h1', label: 'H1 标题内容', category: '📄 On-Page',
    render(val) {
      if (!val) return { value: '❌ 缺失', status: 'fail' };
      return { value: `"${val.slice(0, 50)}${val.length > 50 ? '…' : ''}"`, status: 'pass' };
    },
  },
  {
    key: 'h2Count', label: 'H2 标题数量', category: '📄 On-Page',
    render(val) {
      const status = val === 0 ? 'warn' : val >= 2 ? 'pass' : 'warn';
      return { value: `${val} 个${val < 2 ? ' ⚠️' : ''}`, status };
    },
  },
  {
    key: 'lang', label: 'HTML lang 属性', category: '📄 On-Page',
    render(val) {
      if (!val) return { value: '❌ 未设置', status: 'warn' };
      return { value: `✅ lang="${val}"`, status: 'pass' };
    },
  },
  {
    key: 'hasOg', label: 'Open Graph 标签', category: '📄 On-Page',
    render(val, isMe, all, row) {
      if (!val) return { value: '❌ og:title/desc 缺失', status: 'fail' };
      return { value: `✅ OG 完整${row.hasOgImage ? ' + 图片' : ' (无图片)'}`, status: row.hasOgImage ? 'pass' : 'warn' };
    },
  },
  {
    key: 'hasTwitter', label: 'Twitter Card', category: '📄 On-Page',
    render(val) {
      return val ? { value: '✅ 已配置', status: 'pass' } : { value: '— 未配置', status: 'info' };
    },
  },
  // ── Content ──
  {
    key: 'wordCount', label: '字词数', category: '📝 内容',
    render(val, isMe, all) {
      const max = Math.max(...all.filter(v => v > 0));
      const status = val < 300 ? 'fail' : val < 600 ? 'warn' : 'pass';
      return { value: `${val.toLocaleString()} 词${val === max && max > 0 ? ' 🏆' : ''}`, status };
    },
  },
  {
    key: 'atomicCount', label: 'Q&A / 原子答案数', category: '📝 内容',
    render(val) {
      const status = val === 0 ? 'warn' : val >= 3 ? 'pass' : 'warn';
      return { value: `${val} 段 Q&A 结构`, status };
    },
  },
  {
    key: 'hasFaq', label: 'FAQ 结构（≥3 Q&A）', category: '📝 内容',
    render(val) {
      return val ? { value: '✅ 有 FAQ 结构', status: 'pass' } : { value: '❌ 无 FAQ 结构', status: 'warn' };
    },
  },
  // ── Schema ──
  {
    key: 'hasSchema', label: '结构化数据 (JSON-LD)', category: '📋 Schema',
    render(val, isMe, all, row) {
      if (!val) return { value: '❌ 无 Schema', status: 'fail' };
      return { value: `✅ ${row.schemaTypes.join(', ')}`, status: 'pass' };
    },
  },
  {
    key: 'hasFaqSchema', label: 'FAQPage Schema', category: '📋 Schema',
    render(val) {
      return val ? { value: '✅ 有 FAQPage', status: 'pass' } : { value: '— 无 FAQPage', status: 'info' };
    },
  },
  {
    key: 'hasOrgSchema', label: 'Organization Schema', category: '📋 Schema',
    render(val) {
      return val ? { value: '✅ 有', status: 'pass' } : { value: '❌ 无', status: 'warn' };
    },
  },
  {
    key: 'hasPersonSchema', label: 'Person Schema (YMYL)', category: '📋 Schema',
    render(val) {
      return val
        ? { value: '✅ 有 Person Schema', status: 'pass' }
        : { value: '❌ 缺失（YMYL 必要项）', status: 'fail' };
    },
  },
  // ── Links ──
  {
    key: 'internalLinks', label: '正文内链数（非导航）', category: '🔗 链接',
    render(val, isMe, all) {
      const max = Math.max(...all);
      const status = val < 3 ? 'warn' : 'pass';
      return { value: `${val} 个${val === max && max > 0 ? ' 🏆' : ''}`, status };
    },
  },
  {
    key: 'externalLinks', label: '外链数（引用来源）', category: '🔗 链接',
    render(val) {
      const status = val === 0 ? 'warn' : 'pass';
      return { value: `${val} 个${val === 0 ? ' ⚠️' : ''}`, status };
    },
  },
  // ── Images ──
  {
    key: 'altCoverage', label: '图片 Alt 覆盖率', category: '🖼️ 图片',
    render(val, isMe, all, row) {
      if (row.imageCount === 0) return { value: '— 无图片', status: 'info' };
      const status = val === null ? 'info' : val >= 80 ? 'pass' : val >= 50 ? 'warn' : 'fail';
      return { value: `${val ?? '?'}% (${row.imgWithAlt}/${row.imageCount})`, status };
    },
  },
  // ── Technical ──
  {
    key: 'isHttps', label: 'HTTPS', category: '🔧 技术',
    render(val) {
      return val ? { value: '✅ HTTPS', status: 'pass' } : { value: '❌ HTTP（严重）', status: 'fail' };
    },
  },
  {
    key: 'htmlSize', label: 'HTML 体积', category: '🔧 技术',
    render(val) {
      const kb = Math.round((val || 0) / 1024);
      const status = kb > 500 ? 'warn' : 'pass';
      return { value: `${kb} KB${kb > 500 ? ' ⚠️' : ''}`, status };
    },
  },
  {
    key: 'hasRobots', label: 'robots.txt', category: '🔧 技术',
    render(val) {
      return val ? { value: '✅ 存在', status: 'pass' } : { value: '❌ 未检测到', status: 'fail' };
    },
  },
  {
    key: 'hasSitemap', label: 'sitemap.xml', category: '🔧 技术',
    render(val) {
      return val ? { value: '✅ 存在', status: 'pass' } : { value: '⚠️ 未检测到', status: 'warn' };
    },
  },
  {
    key: 'hasLlmsTxt', label: 'llms.txt (GEO)', category: '🤖 GEO/AI',
    render(val) {
      return val ? { value: '✅ 已配置', status: 'pass' } : { value: '— 尚未配置', status: 'info' };
    },
  },
  {
    key: 'aiBlocked', label: 'AI 爬虫屏蔽', category: '🤖 GEO/AI',
    render(val) {
      if (!Array.isArray(val) || val.length === 0) return { value: '✅ 未屏蔽 AI 爬虫', status: 'pass' };
      return { value: `⚠️ 屏蔽: ${val.slice(0, 2).join(', ')}`, status: 'warn' };
    },
  },
];

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pass: { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.18)',  text: 'var(--accent-green)' },
  warn: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)', text: 'var(--accent-gold)' },
  fail: { bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.18)',  text: 'var(--accent-red)' },
  info: { bg: 'transparent',           border: 'rgba(255,255,255,0.04)', text: 'var(--text-primary)' },
};

// ── Field fix database ────────────────────────────────────────────────────────
const FIELD_FIXES = {
  titleLen:      '将 Title 控制在 45-60 字符，核心关键词放在前半段，格式：「关键词 | 品牌名」。',
  title:         '为该页面撰写包含核心关键词、45-60 字符的唯一 Title 标签。',
  descLen:       '将 Meta Description 控制在 120-155 字符，末尾加 CTA（如"立即查看汇率"）。',
  description:   '撰写 120-155 字符的描述，概括页面核心价值 + 用户收益 + 一个行动号召。',
  h1Count:       '每页只保留一个 <h1>，确保其包含核心关键词，其他标题降级为 H2/H3。',
  h1:            '为页面添加包含主关键词的 <h1>，建议格式：「[动词] + [关键词] + [价值主张]」。',
  h2Count:       '增加 H2 子标题（建议 3-6 个），将内容结构化为可扫描的模块，提升内容层次分。',
  lang:          '在 <html> 标签上添加 lang 属性，如 lang="zh-CN" 或 lang="en"，帮助搜索引擎理解语言。',
  hasOg:         '添加完整的 Open Graph 标签：og:title, og:description, og:image（1200×630px）, og:url。',
  hasTwitter:    '添加 Twitter Card 标签：<meta name="twitter:card" content="summary_large_image" />。',
  wordCount:     '将内容扩充至 800 词以上，加入数据对比表、FAQ（≥5条）、操作指南等结构化内容。',
  atomicCount:   '增加 Q&A 结构（「## 问题」+「直接回答段落」），每对控制在 40-120 词，提升 AI 引用就绪度。',
  hasFaq:        '添加 FAQ 区块（≥5 个 QA），并用 FAQPage Schema 标记，有助于 Google Rich Results 和 AI Overview。',
  hasSchema:     '添加适合页面类型的 JSON-LD Schema：FAQPage（内容页）、Organization（全站）、Person（YMYL 必须）。',
  hasFaqSchema:  '将现有 FAQ 内容包裹进 FAQPage Schema，格式：{"@type":"FAQPage","mainEntity":[...]}。',
  hasOrgSchema:  '添加 Organization Schema，声明公司名称、URL、Logo、联系方式，建立品牌信任信号。',
  hasPersonSchema:'添加 Person Schema（作者/专家信息），包含 name, jobTitle, knowsAbout, sameAs，这是 YMYL 2026 核心要求。',
  internalLinks: '在正文中增加 3-8 个指向相关内容页的锚文本链接，使用描述性锚文本而非"点击这里"。',
  externalLinks: '适当添加指向权威外部来源的引用链接（监管机构官网、学术研究等），增强 E-E-A-T 信任度。',
  altCoverage:   '为所有 <img> 标签添加描述性 alt 属性，包含相关关键词（避免堆砌），空图可用 alt=""。',
  hasSitemap:    '创建 sitemap.xml 并在 robots.txt 中用 "Sitemap: [URL]" 声明，然后在 GSC 中提交。',
  hasLlmsTxt:    '在根目录创建 llms.txt（参照 https://llmstxt.org/），声明品牌定位、核心服务和内容权限，提升 AI 搜索引用率。',
  aiBlocked:     '审查 robots.txt 中对 GPTBot / ClaudeBot 等 AI 爬虫的屏蔽规则，确认是否为有意为之。若允许，删除对应 Disallow 行。',
  htmlSize:      '优化 HTML 体积：移除注释、压缩内联 CSS/JS、延迟加载非关键脚本，目标 < 200KB。',
};

// ── Main render ───────────────────────────────────────────────────────────────
export function renderComparisonResults(myUrl, myPageData, competitorUrls, competitorPageDatas, keyword) {
  const allUrls  = [myUrl, ...competitorUrls];
  const allData  = [myPageData, ...competitorPageDatas];
  const allRows  = allData.map((d, i) => extractFields(allUrls[i], d));

  // Build gap list
  const gaps = [];
  for (const field of FIELDS) {
    const allVals  = allRows.map(r => r[field.key]);
    const myResult = field.render(allRows[0][field.key], true, allVals, allRows[0]);

    if (myResult.status === 'fail' || myResult.status === 'warn') {
      const compResults = allRows.slice(1).map(r => field.render(r[field.key], false, allVals, r));
      const anyCompPass = compResults.some(cr => cr.status === 'pass');
      if (anyCompPass || myResult.status === 'fail') {
        gaps.push({ field, myResult, compResults, severity: myResult.status });
      }
    }
  }

  const critCount = gaps.filter(g => g.severity === 'fail').length;
  const warnCount = gaps.filter(g => g.severity === 'warn').length;

  // Category grouping
  const categories = [...new Set(FIELDS.map(f => f.category))];

  // Build table header
  const headerCells = allRows.map((r, i) => `
    <th style="padding:var(--space-3) var(--space-4);font-size:12px;font-weight:700;text-align:left;min-width:160px;
      ${i === 0
        ? 'color:var(--accent-green);border-bottom:2px solid var(--accent-green)40'
        : 'color:var(--text-muted);border-bottom:1px solid var(--border-default)'}">
      ${i === 0 ? '🏠 ' : `<span style="color:var(--text-muted);font-weight:400">#${i} </span>`}${esc(r.hostname)}
      ${i === 0 ? '<div style="font-size:9px;font-weight:400;color:var(--accent-green);opacity:0.7;margin-top:2px">我方页面</div>' : ''}
    </th>
  `).join('');

  // Build table rows
  const tableBody = categories.map(cat => {
    const catFields = FIELDS.filter(f => f.category === cat);
    const catRow = `
      <tr>
        <td colspan="${allRows.length + 1}" style="padding:6px var(--space-4);
          background:rgba(255,255,255,0.025);font-size:10px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);
          border-top:1px solid var(--border-default);border-bottom:1px solid var(--border-default)40">
          ${esc(cat)}
        </td>
      </tr>`;
    const dataRows = catFields.map(field => {
      const allVals = allRows.map(r => r[field.key]);
      const cells = allRows.map((row, i) => {
        const result = field.render(row[field.key], i === 0, allVals, row);
        const s = STATUS_STYLE[result.status] || STATUS_STYLE.info;
        return `
          <td style="padding:var(--space-2) var(--space-4);font-size:12px;
            background:${s.bg};border-bottom:1px solid var(--border-default)30;
            ${i === 0 ? 'border-left:2px solid rgba(34,197,94,0.3)' : ''};
            color:${s.text};word-break:break-word;max-width:200px;line-height:1.4">
            ${esc(result.value)}
          </td>`;
      }).join('');
      return `
        <tr>
          <td style="padding:var(--space-2) var(--space-4);font-size:11px;color:var(--text-muted);
            border-bottom:1px solid var(--border-default)30;white-space:nowrap">
            ${esc(field.label)}
          </td>
          ${cells}
        </tr>`;
    }).join('');
    return catRow + dataRows;
  }).join('');

  // Build gap cards
  const gapCards = gaps.length === 0
    ? `<div class="glass-card" style="text-align:center;padding:var(--space-8);color:var(--accent-green)">
        🎉 <strong>在所有对比维度中，我方页面均已达到或超越竞品！</strong>
       </div>`
    : gaps.map((g, gi) => {
        const isCrit = g.severity === 'fail';
        const color  = isCrit ? 'var(--accent-red)' : 'var(--accent-orange)';
        const label  = isCrit ? '🔴 必须修复' : '🟠 改进机会';
        const fix    = FIELD_FIXES[g.field.key] || '参考得分最高的竞品，分析其处理方式并加以改进。';
        const bestComp = g.compResults.find(r => r.status === 'pass') || g.compResults[0];
        const llmPromptBase = `我的页面 ${myUrl} 在「${g.field.label}」维度落后于竞品。\n我方现状：${g.myResult.value}\n竞品做法：${bestComp?.value || '达标'}\n请务实地给出3条具体、可直接执行的优化建议，包括建议的实际内容文字（如适用）。`;

        return `
          <div class="glass-card cmp-gap-card" data-gap="${gi}" style="margin-bottom:var(--space-3);border-left:3px solid ${color}">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap">
              <span class="badge" style="background:${color}22;color:${color}">${label}</span>
              <span class="badge badge-info">${esc(g.field.category)}</span>
              <h4 style="margin:0;font-size:var(--font-size-sm);flex:1">${esc(g.field.label)}</h4>
              <button class="btn btn-secondary cmp-ai-btn"
                data-prompt="${esc(llmPromptBase)}"
                data-out="cmp-ai-${gi}"
                style="font-size:11px;padding:3px 10px;background:var(--accent-blue);color:white;border:none;flex-shrink:0">
                ✨ AI 建议
              </button>
            </div>
            <div id="cmp-ai-${gi}" class="cmp-ai-output" style="display:none;margin-bottom:var(--space-2);padding:var(--space-3);
              background:rgba(0,0,0,0.25);border:1px solid rgba(77,159,255,0.2);border-radius:6px;
              font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-primary)"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-2)">
              <div style="background:rgba(239,68,68,0.06);padding:8px 10px;border-radius:4px">
                <div style="font-size:9px;color:var(--accent-red);margin-bottom:2px">❌ 我方现状</div>
                <div style="font-size:12px;color:var(--text-primary)">${esc(g.myResult.value)}</div>
              </div>
              <div style="background:rgba(34,197,94,0.06);padding:8px 10px;border-radius:4px">
                <div style="font-size:9px;color:var(--accent-green);margin-bottom:2px">✅ 竞品已做到</div>
                <div style="font-size:12px;color:var(--text-primary)">${esc(bestComp?.value != null ? String(bestComp.value) : '达标')}</div>
              </div>
            </div>
            <div style="background:rgba(0,0,0,0.15);padding:10px 12px;border-radius:4px;font-size:13px;color:var(--text-primary)">
              <strong style="color:var(--accent-blue)">👉 修复方案：</strong>${esc(fix)}
            </div>
          </div>`;
      }).join('');

  // Summary bar per URL
  const summaryBars = allRows.map((row, i) => {
    const total    = FIELDS.length;
    const passCount = FIELDS.filter(f => {
      const allVals = allRows.map(r => r[f.key]);
      return f.render(row[f.key], i === 0, allVals, row).status === 'pass';
    }).length;
    const pct = Math.round((passCount / total) * 100);
    const color = pct >= 70 ? 'var(--accent-green)' : pct >= 45 ? 'var(--accent-gold)' : 'var(--accent-red)';
    return `
      <div style="text-align:center;flex:1">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">
          ${i === 0 ? '🏠 ' : ''}${esc(row.hostname)}
        </div>
        <div style="font-size:var(--font-size-2xl);font-weight:900;color:${color}">${pct}%</div>
        <div style="font-size:10px;color:var(--text-muted)">${passCount}/${total} 通过</div>
        <div style="margin-top:6px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 1s ease"></div>
        </div>
      </div>`;
  }).join('<div style="width:1px;background:var(--border-default)"></div>');

  return `
    <div class="container animate-slide-up" style="padding-top:var(--space-4);padding-bottom:var(--space-10)">

      <!-- Header -->
      <div class="glass-card animate-fade-in" style="margin-bottom:var(--space-5);border-color:rgba(77,159,255,0.2)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3)">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">并排对比分析 · ${FIELDS.length} 个检查项</div>
            <h2 style="margin:0;font-size:var(--font-size-xl);font-weight:800">⚔️ 竞品对等页面对比矩阵</h2>
            <div style="margin-top:4px;font-size:12px;color:var(--text-muted)">
              ${esc(allRows[0].hostname)} vs ${allRows.slice(1).map((r) => esc(r.hostname)).join(' vs ')}
              ${keyword ? ` · 🎯 ${esc(keyword)}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:var(--space-3)">
            ${critCount > 0 ? `<div style="text-align:center"><div style="font-size:var(--font-size-2xl);font-weight:900;color:var(--accent-red)">${critCount}</div><div style="font-size:10px;color:var(--text-muted)">必须修复</div></div>` : ''}
            ${warnCount > 0 ? `<div style="text-align:center"><div style="font-size:var(--font-size-2xl);font-weight:900;color:var(--accent-orange)">${warnCount}</div><div style="font-size:10px;color:var(--text-muted)">改进机会</div></div>` : ''}
          </div>
        </div>
        <!-- Score bars -->
        <div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--border-default)">
          ${summaryBars}
        </div>
      </div>

      <!-- Matrix Table -->
      <div class="glass-card" style="padding:0;overflow:hidden;margin-bottom:var(--space-6)">
        <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-default);display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:var(--font-size-base)">📊 逐字段对比矩阵（${FIELDS.length} 项）</h3>
          <div style="font-size:10px;color:var(--text-muted)">
            <span style="color:var(--accent-green)">■</span> 达标 &nbsp;
            <span style="color:var(--accent-gold)">■</span> 需改进 &nbsp;
            <span style="color:var(--accent-red)">■</span> 问题
          </div>
        </div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table style="width:100%;border-collapse:collapse;min-width:${400 + allRows.length * 160}px">
            <thead>
              <tr>
                <th style="padding:var(--space-3) var(--space-4);font-size:11px;color:var(--text-muted);
                  text-align:left;border-bottom:1px solid var(--border-default);width:130px;
                  background:rgba(0,0,0,0.1);position:sticky;left:0;z-index:2">检查项</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
      </div>

      <!-- Gap Cards -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
          <div>
            <h3 style="margin:0;font-size:var(--font-size-base);font-weight:700">🎯 差距分析 & 行动方案</h3>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">按严重程度排序，点击「✨ AI 建议」获取 LLM 定制优化内容</div>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button id="comp-copy-gaps" class="btn btn-ghost" style="font-size:var(--font-size-xs)">📋 复制行动清单</button>
            <button id="comp-export-csv" class="btn btn-ghost" style="font-size:var(--font-size-xs)">📥 导出 CSV</button>
          </div>
        </div>
        ${gapCards}
      </div>
    </div>
  `;
}

// ── Init interactions ─────────────────────────────────────────────────────────
export function initComparisonResults(container) {
  // Copy action list
  const copyBtn = container.querySelector('#comp-copy-gaps');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const lines = [];
      container.querySelectorAll('.cmp-gap-card').forEach((card, i) => {
        const title  = card.querySelector('h4')?.textContent?.trim() || '';
        const fix    = card.querySelector('strong')?.parentElement?.textContent?.replace('👉 修复方案：', '').trim() || '';
        if (title) lines.push(`${i + 1}. ${title}\n   → ${fix}`);
      });
      navigator.clipboard.writeText(lines.join('\n\n') || '无差距项').then(() => {
        copyBtn.textContent = '✅ 已复制！';
        setTimeout(() => { copyBtn.textContent = '📋 复制行动清单'; }, 2000);
      });
    });
  }

  // Export CSV
  const exportBtn = container.querySelector('#comp-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const rows = [['严重程度', '维度', '检查项', '我方现状', '竞品现状', '修复方案']];
      container.querySelectorAll('.cmp-gap-card').forEach(card => {
        const sev    = card.querySelector('.badge')?.textContent?.trim() || '';
        const cat    = card.querySelectorAll('.badge')[1]?.textContent?.trim() || '';
        const title  = card.querySelector('h4')?.textContent?.trim() || '';
        const myVal  = card.querySelectorAll('[style*="accent-red"]')[1]?.textContent?.trim() || '';
        const compVal= card.querySelectorAll('[style*="accent-green"]')[1]?.textContent?.trim() || '';
        const fix    = card.querySelector('strong')?.parentElement?.textContent?.replace('👉 修复方案：', '').trim() || '';
        rows.push([sev, cat, title, myVal, compVal, fix]);
      });
      const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `comparison-gaps-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
    });
  }

  // AI suggestion buttons
  container.querySelectorAll('.cmp-ai-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prompt   = btn.getAttribute('data-prompt');
      const outId    = btn.getAttribute('data-out');
      const outEl    = container.querySelector(`#${outId}`);
      if (!outEl || !prompt) return;

      outEl.style.display = 'block';
      outEl.innerHTML = '<span style="color:var(--text-muted)">正在调用 AI，请稍候... ⏳</span>';
      btn.disabled = true;
      btn.textContent = '生成中...';

      try {
        let first = true;
        await streamContent(prompt, chunk => {
          if (first) { outEl.innerHTML = ''; first = false; }
          outEl.innerHTML += esc(chunk);
          outEl.scrollTop = outEl.scrollHeight;
        });
        btn.textContent = '✅ 已完成';
      } catch (err) {
        outEl.innerHTML = `<span style="color:var(--accent-red)">⚠️ ${esc(err.message)}</span>`;
        btn.textContent = '🔁 重试';
        btn.disabled = false;
      }
    });
  });
}
