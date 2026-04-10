// ===== SEOGEO4YMYL — On-Page SEO Analyzer =====

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const OnpageAnalyzer = {
  id: 'onpage',
  name: '页面 SEO',
  icon: '📄',
  weight: 0.11,
  requiredResources: ['html'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];

    // 1. Title
    const title = data.meta?.title;
    const titleLen = data.meta?.titleLength || 0;
    const titleOk = title && titleLen >= 15 && titleLen <= 70;
    items.push(createAuditItem({
      finding: title ? `Title: "${title}" (${titleLen}字符)` : 'Title 标签缺失',
      evidence: titleOk ? '长度在 15-70 字符的最佳范围内' : title ? `长度 ${titleLen} 字符，建议 15-70` : '未找到 <title>',
      impact: titleOk ? 'Pass' : title ? 'Warning' : 'Critical',
      fix: titleOk ? null : '优化 Title 标签，控制在 15-70 字符',
      fixCode: titleOk ? null : `<title>[包含核心关键词的标题，15-70字符]</title>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: titleOk, points: 15 });

    // 2. Meta Description
    const desc = data.meta?.description;
    const descLen = data.meta?.descriptionLength || 0;
    const descOk = desc && descLen >= 50 && descLen <= 160;
    items.push(createAuditItem({
      finding: desc ? `Meta Description (${descLen}字符)` : 'Meta Description 缺失',
      evidence: descOk ? '长度在 50-160 字符的最佳范围' : desc ? `长度 ${descLen}，建议 50-160` : '未设置',
      impact: descOk ? 'Pass' : desc ? 'Warning' : 'Warning',
      fix: descOk ? null : '优化 Meta Description，50-160 字符',
      fixCode: descOk ? null : `<meta name="description" content="[包含核心关键词的描述，50-160字符]" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: descOk, points: 10 });

    // 3. H1 & Intent Match (LLM Review Flagged)
    const h1Count = data.headings?.h1?.length || 0;
    const h1Text = h1Count > 0 ? data.headings.h1[0] : '';
    const h1Ok = h1Count === 1;
    items.push(createAuditItem({
      finding: h1Ok ? `H1: "${h1Text}" (需 LLM 判定意图)` : h1Count === 0 ? 'H1 标签缺失' : `H1 标签过多 (${h1Count}个)`,
      evidence: h1Ok ? 'H1 结构正确，但需要语义模型确认是否覆盖核心搜索意图' : `检测到 ${h1Count} 个 H1 标签，每页应恰好 1 个`,
      impact: h1Ok ? 'Info' : 'Warning',
      fix: h1Ok ? null : '确保每页恰好有一个 H1 标签',
      confidence: h1Ok ? 'Likely' : 'Confirmed',
      llmReviewRequired: h1Ok, // Trigger LLM if it exists
      prompt: h1Ok ? `分析以下 H1 标签："${h1Text}"。判断其是否清晰覆盖了金融/YMYL领域的搜索意图？如果不符合，请提供 3 个更具吸引力且包含核心关键词的修改建议。` : null,
    }));
    checks.push({ check: h1Ok, points: 10 });

    // 4. H2 Structure
    const h2Count = data.headings?.h2?.length || 0;
    const h2Ok = h2Count >= 2;
    items.push(createAuditItem({
      finding: `H2 标签: ${h2Count} 个${h2Ok ? '' : ' (建议至少 2 个)'}`,
      evidence: h2Ok ? '页面有良好的内容层次结构' : '缺少 H2 标签，影响内容可扫描性',
      impact: h2Ok ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: h2Ok, points: 8 });

    // 5. Images Alt Text
    const images = data.images || [];
    const imagesWithAlt = images.filter(i => i.alt && i.alt.trim().length > 0);
    const altRatio = images.length > 0 ? imagesWithAlt.length / images.length : 1;
    const altOk = altRatio >= 0.8;
    items.push(createAuditItem({
      finding: `图片 Alt 文本: ${imagesWithAlt.length}/${images.length} 有 alt`,
      evidence: `${Math.round(altRatio * 100)}% 的图片有 alt 属性`,
      impact: altOk ? 'Pass' : 'Warning',
      fix: altOk ? null : '为所有图片添加描述性 alt 文本',
      confidence: 'Confirmed',
    }));
    checks.push({ check: altOk, points: 10 });

    // 6. Open Graph Tags
    const hasOg = !!(data.meta?.ogTitle && data.meta?.ogDescription);
    items.push(createAuditItem({
      finding: hasOg ? 'Open Graph 标签已设置' : 'Open Graph 标签不完整',
      evidence: `og:title: ${data.meta?.ogTitle ? '✅' : '❌'}, og:description: ${data.meta?.ogDescription ? '✅' : '❌'}, og:image: ${data.meta?.ogImage ? '✅' : '❌'}`,
      impact: hasOg ? 'Pass' : 'Warning',
      fix: hasOg ? null : '添加完整的 Open Graph 标签',
      fixCode: hasOg ? null : `<meta property="og:title" content="[页面标题]" />
<meta property="og:description" content="[页面描述]" />
<meta property="og:image" content="[图片URL, 1200x630px]" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${data.url}" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasOg, points: 8 });

    // 7. Internal Links
    const internalLinks = (data.links || []).filter(l => l.isInternal);
    const internalOk = internalLinks.length >= 3;
    items.push(createAuditItem({
      finding: `内部链接: ${internalLinks.length} 个`,
      evidence: internalOk ? '内部链接数量充足' : '内部链接过少，影响爬取深度和主题权威',
      impact: internalOk ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: internalOk, points: 10 });

    // 8. External Links
    const externalLinks = (data.links || []).filter(l => !l.isInternal);
    const hasExternal = externalLinks.length > 0;
    items.push(createAuditItem({
      finding: `外部链接: ${externalLinks.length} 个`,
      evidence: hasExternal ? '页面引用了外部权威来源' : '无外部链接，考虑添加权威引用',
      impact: hasExternal ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasExternal, points: 5 });

    // 9. Twitter Card
    const hasTwitter = !!data.meta?.twitterCard;
    items.push(createAuditItem({
      finding: hasTwitter ? `Twitter Card: ${data.meta.twitterCard}` : 'Twitter Card 未设置',
      evidence: hasTwitter ? '✅ 社交分享优化' : '缺少 Twitter Card meta',
      impact: hasTwitter ? 'Pass' : 'Info',
      fixCode: hasTwitter ? null : `<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[标题]" />
<meta name="twitter:description" content="[描述]" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasTwitter, points: 4 });

    const rawScore = scoreFromChecks(checks, 80);
    return createModuleResult('onpage', rawScore, items, ['core']);
  },
};
