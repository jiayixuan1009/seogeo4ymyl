// ===== SEOGEO4YMYL — Structured Data Analyzer =====
// v5: Author/Person/ProfilePage + Financial Schema + knowsAbout

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const StructuredDataAnalyzer = {
  id: 'structured-data',
  name: '结构化数据',
  icon: '📋',
  weight: 0.10,
  requiredResources: ['html'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];
    const schemas = data.schemas || [];

    // 1. Any JSON-LD present
    const hasJsonLd = schemas.length > 0;
    items.push(createAuditItem({
      finding: hasJsonLd ? `检测到 ${schemas.length} 个 JSON-LD Schema` : 'JSON-LD 结构化数据缺失',
      evidence: hasJsonLd ? `类型: ${[...new Set(schemas.map(s => s['@type']))].join(', ')}` : '未在页面找到 script[type="application/ld+json"]',
      impact: hasJsonLd ? 'Pass' : 'Critical',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasJsonLd, points: 10 });

    // 2. Organization Schema
    const hasOrg = schemas.some(s => s['@type'] === 'Organization');
    items.push(createAuditItem({
      finding: hasOrg ? 'Organization Schema ✅' : 'Organization Schema 缺失',
      evidence: hasOrg ? '已提供公司/组织结构化信息' : 'Fintech 站点应提供 Organization Schema',
      impact: hasOrg ? 'Pass' : 'Warning',
      fixCode: hasOrg ? null : `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[公司名称]",
  "url": "${data.url}",
  "logo": "[Logo URL]",
  "sameAs": [
    "https://twitter.com/[handle]",
    "https://linkedin.com/company/[name]"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "[电话]",
    "contactType": "customer service"
  }
}
</script>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasOrg, points: 12 });

    // 3. 🔥 Person Schema (v5 critical for YMYL)
    const hasPerson = schemas.some(s => s['@type'] === 'Person');
    const personSchema = schemas.find(s => s['@type'] === 'Person');
    const hasKnowsAbout = personSchema?.knowsAbout?.length > 0;

    items.push(createAuditItem({
      finding: hasPerson ? `Person Schema ✅${hasKnowsAbout ? ' + knowsAbout ✅' : ' (缺少 knowsAbout)'}` : '🔥 Person Schema 缺失',
      evidence: hasPerson
        ? `作者: ${personSchema?.name || '未知'}${hasKnowsAbout ? `, 专长: ${personSchema.knowsAbout.slice(0, 3).join(', ')}` : ''}`
        : 'YMYL Fintech 站点必须提供 Author Person Schema (2026 Core Update 后为必选项)',
      impact: hasPerson ? (hasKnowsAbout ? 'Pass' : 'Warning') : 'Critical',
      fixCode: hasPerson ? null : `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[作者姓名]",
  "url": "[作者简介页URL]",
  "jobTitle": "[职位，如 Senior Financial Analyst]",
  "knowsAbout": [
    "international remittance",
    "cryptocurrency trading",
    "stock market analysis",
    "financial regulation"
  ],
  "sameAs": ["https://linkedin.com/in/[profile]"],
  "worksFor": {
    "@type": "Organization",
    "name": "[公司名]"
  }
}
</script>`,
      confidence: 'Confirmed',
      prompt: hasPerson ? null : `为 ${data.url} 的 Fintech 内容作者生成 Person Schema JSON-LD，必须包含 knowsAbout 属性，专业领域覆盖国际汇款、加密货币和股票交易。`,
    }));
    checks.push({ check: hasPerson, points: 15 });
    checks.push({ check: hasKnowsAbout, points: 8 });

    // 4. ProfilePage Schema
    const hasProfilePage = schemas.some(s => s['@type'] === 'ProfilePage');
    items.push(createAuditItem({
      finding: hasProfilePage ? 'ProfilePage Schema ✅' : 'ProfilePage Schema 未设置',
      evidence: hasProfilePage ? '作者简介页已标记' : '建议在作者简介页添加 ProfilePage Schema',
      impact: hasProfilePage ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasProfilePage, points: 5 });

    // 5. FAQPage Schema
    const hasFaq = schemas.some(s => s['@type'] === 'FAQPage');
    items.push(createAuditItem({
      finding: hasFaq ? 'FAQPage Schema ✅' : 'FAQPage Schema 未检测到',
      evidence: hasFaq ? 'FAQ 结构化数据有助于 AI Overview 引用' : '如有 FAQ 内容，建议添加 FAQPage Schema',
      impact: hasFaq ? 'Pass' : 'Info',
      fixCode: hasFaq ? null : `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[问题1]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[答案1]"
      }
    }
  ]
}
</script>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasFaq, points: 8 });

    // 6. Financial Schema
    const hasFinancial = schemas.some(s =>
      ['FinancialProduct', 'BankAccount', 'CurrencyConversionService', 'ExchangeRateSpecification'].includes(s['@type'])
    );
    items.push(createAuditItem({
      finding: hasFinancial ? 'Financial Schema ✅' : 'Financial Schema 未检测到',
      evidence: hasFinancial ? '金融产品结构化数据已配置' : 'Fintech 站点建议使用 FinancialProduct/CurrencyConversionService Schema',
      impact: hasFinancial ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasFinancial, points: 7 });

    // 7. Article Schema
    const hasArticle = schemas.some(s => ['Article', 'NewsArticle', 'BlogPosting'].includes(s['@type']));
    items.push(createAuditItem({
      finding: hasArticle ? 'Article Schema ✅' : 'Article Schema 未检测到',
      evidence: hasArticle ? '文章类型已标记' : '如为文章/博客页面，建议添加 Article Schema',
      impact: hasArticle ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasArticle, points: 5 });

    const rawScore = scoreFromChecks(checks, 70);
    return createModuleResult('structured-data', rawScore, items, ['2026-critical', 'eeat']);
  },
};
