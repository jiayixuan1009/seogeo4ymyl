// ===== SEOGEO4YMYL — Off-Page Signals Analyzer =====
// Limited by frontend-only architecture — extracts available signals from HTML

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const OffpageAnalyzer = {
  id: 'offpage',
  name: '站外信号',
  icon: '🌐',
  weight: 0.05,
  requiredResources: ['html'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];
    const links = data.links || [];
    const schemas = data.schemas || [];

    // 1. External Authority Links
    const externalLinks = links.filter(l => !l.isInternal && l.href?.startsWith('http'));
    const authorityDomains = ['gov', 'edu', 'reuters.com', 'bloomberg.com', 'wsj.com',
      'sec.gov', 'fca.org', 'bis.org', 'imf.org', 'worldbank.org', 'wikipedia.org'];
    const authorityLinks = externalLinks.filter(l =>
      authorityDomains.some(d => l.href?.includes(d))
    );

    items.push(createAuditItem({
      finding: `外部链接: ${externalLinks.length} 个 (权威来源: ${authorityLinks.length})`,
      evidence: authorityLinks.length > 0
        ? `引用的权威来源: ${authorityLinks.map(l => new URL(l.href).hostname).slice(0, 5).join(', ')}`
        : '未检测到 .gov, .edu 或知名财经机构的引用',
      impact: authorityLinks.length > 0 ? 'Pass' : 'Warning',
      fix: authorityLinks.length === 0 ? '引用权威来源 (监管机构、研究报告) 提升 Source-Worthiness' : null,
      confidence: 'Confirmed',
    }));
    checks.push({ check: authorityLinks.length > 0, points: 25 });
    checks.push({ check: externalLinks.length >= 3, points: 10 });

    // 2. Social Profiles (via Schema sameAs)
    const sameAs = schemas.flatMap(s => s.sameAs || []);
    const socialDomains = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'youtube.com', 'github.com'];
    const socialProfiles = sameAs.filter(url => socialDomains.some(d => url.includes(d)));
    items.push(createAuditItem({
      finding: `社交档案链接: ${socialProfiles.length} 个`,
      evidence: socialProfiles.length > 0 ? socialProfiles.join(', ') : '未在 Schema sameAs 中检测到社交档案',
      impact: socialProfiles.length >= 2 ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: socialProfiles.length >= 2, points: 15 });

    // 3. Nofollow Usage
    const nofollowExternals = externalLinks.filter(l => !l.isFollow);
    const nofollowRatio = externalLinks.length > 0 ? nofollowExternals.length / externalLinks.length : 0;
    items.push(createAuditItem({
      finding: `外链 Nofollow: ${nofollowExternals.length}/${externalLinks.length}`,
      evidence: `${Math.round(nofollowRatio * 100)}% 的外链使用了 nofollow`,
      impact: 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: externalLinks.length > 0, points: 10 });

    // 4. Brand Mentions (in Schema)
    const orgName = schemas.find(s => s['@type'] === 'Organization')?.name;
    items.push(createAuditItem({
      finding: orgName ? `品牌 Schema 名称: ${orgName}` : '品牌 Schema 未设置',
      evidence: orgName ? '品牌名称已在结构化数据中定义' : 'Organization name 缺失',
      impact: orgName ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: !!orgName, points: 10 });

    items.push(createAuditItem({
      finding: '⚠️ 完整的站外分析需要服务端 API',
      evidence: '反向链接数量、Domain Rating、Referring Domains 等数据需要 Ahrefs/Moz API',
      impact: 'Info',
      confidence: 'Confirmed',
    }));

    const rawScore = scoreFromChecks(checks, 70);
    return createModuleResult('offpage', rawScore, items, ['limited-frontend']);
  },
};
