// ===== SEOGEO4YMYL — Technical SEO Analyzer =====
// Checks: HTTPS, canonical, robots.txt, sitemap, meta robots, viewport,
// AI crawler policies, llms.txt, hreflang, response size, crawl directives

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';
import { AI_CRAWLERS } from '../utils/constants.js';

export const TechnicalAnalyzer = {
  id: 'technical',
  name: '技术 SEO',
  icon: '🔧',
  weight: 0.12,
  requiredResources: ['html', 'robots', 'sitemap', 'llms'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];

    // 1. HTTPS
    const isHttps = data.security?.isHttps;
    items.push(createAuditItem({
      finding: isHttps ? 'HTTPS 已启用' : 'HTTPS 未启用',
      evidence: `URL 协议: ${data.url?.split('://')[0]}`,
      impact: isHttps ? 'Pass' : 'Critical',
      fix: isHttps ? null : '将站点迁移至 HTTPS，配置 301 重定向',
      fixCode: isHttps ? null : `# Nginx HTTPS 强制跳转
server {
    listen 80;
    server_name ${new URL(data.url).hostname};
    return 301 https://$host$request_uri;
}`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: isHttps, points: 10 });

    // 2. Canonical
    const hasCanonical = !!data.meta?.canonical;
    items.push(createAuditItem({
      finding: hasCanonical ? 'Canonical 标签已设置' : 'Canonical 标签缺失',
      evidence: hasCanonical ? `canonical: ${data.meta.canonical}` : '未检测到 <link rel="canonical">',
      impact: hasCanonical ? 'Pass' : 'Warning',
      fix: hasCanonical ? null : '在 <head> 中添加 canonical 标签',
      fixCode: hasCanonical ? null : `<link rel="canonical" href="${data.url}" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasCanonical, points: 10 });

    // 3. Meta Viewport
    const hasViewport = !!data.meta?.viewport;
    items.push(createAuditItem({
      finding: hasViewport ? 'Viewport Meta 已设置' : 'Viewport Meta 缺失',
      evidence: hasViewport ? `viewport: ${data.meta.viewport}` : '未检测到 meta viewport',
      impact: hasViewport ? 'Pass' : 'Warning',
      fix: hasViewport ? null : '添加 viewport meta 标签',
      fixCode: hasViewport ? null : `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasViewport, points: 5 });

    // 4. Meta Robots — not noindex
    const robotsMeta = (data.meta?.robots || '').toLowerCase();
    const isIndexable = !robotsMeta.includes('noindex');
    items.push(createAuditItem({
      finding: isIndexable ? '页面可被索引' : '⚠️ 页面设置了 noindex',
      evidence: `meta robots: "${data.meta?.robots || '(未设置)'}"`,
      impact: isIndexable ? 'Pass' : 'Critical',
      fix: isIndexable ? null : '移除 noindex 指令以允许搜索引擎索引',
      confidence: 'Confirmed',
    }));
    checks.push({ check: isIndexable, points: 10 });

    // 5. robots.txt
    const hasRobots = !!data.robots;
    items.push(createAuditItem({
      finding: hasRobots ? 'robots.txt 已配置' : 'robots.txt 未找到',
      evidence: hasRobots ? `${data.robots.rules?.length || 0} 条规则` : '无法获取 /robots.txt',
      impact: hasRobots ? 'Pass' : 'Warning',
      fix: hasRobots ? null : '创建 robots.txt 文件',
      fixCode: hasRobots ? null : `User-agent: *
Allow: /

Sitemap: ${new URL(data.url).origin}/sitemap.xml`,
      confidence: hasRobots ? 'Confirmed' : 'Likely',
    }));
    checks.push({ check: hasRobots, points: 10 });

    // 6. Sitemap
    const hasSitemap = !!data.sitemap;
    items.push(createAuditItem({
      finding: hasSitemap ? 'XML Sitemap 已找到' : 'XML Sitemap 未找到',
      evidence: hasSitemap ? `sitemap.xml 已检测到` : '无法获取 /sitemap.xml',
      impact: hasSitemap ? 'Pass' : 'Warning',
      fix: hasSitemap ? null : '创建 XML Sitemap 并提交到 Google Search Console',
      confidence: hasSitemap ? 'Confirmed' : 'Likely',
    }));
    checks.push({ check: hasSitemap, points: 10 });

    // 7. AI Crawler Policies (key v5 feature)
    if (data.robots?.aiCrawlerPolicies) {
      const policies = data.robots.aiCrawlerPolicies;
      const blockedCount = policies.filter(p => p.isBlocked).length;
      const blocked = policies.filter(p => p.isBlocked).map(p => p.crawler);
      const open = policies.filter(p => !p.isBlocked).map(p => p.crawler);

      // Google-Extended specifically
      const googleExtBlocked = policies.find(p => p.crawler === 'Google-Extended')?.isBlocked;

      items.push(createAuditItem({
        finding: `AI 爬虫策略: ${blockedCount}/${policies.length} 个被阻止`,
        evidence: `被阻止: ${blocked.join(', ') || '无'}\n允许: ${open.slice(0, 5).join(', ')}${open.length > 5 ? '...' : ''}`,
        impact: blockedCount > 10 ? 'Warning' : 'Info',
        fix: blockedCount > 10 ? '考虑允许部分 AI 搜索爬虫以获得 AI Overview 引用机会' : null,
        fixCode: blockedCount > 10 ? `# 推荐的 AI 爬虫策略: 允许搜索引用，阻止训练抓取
# 允许 (用于搜索引用):
# GPTBot, OAI-SearchBot, Google-Extended, PerplexityBot

# 阻止 (仅训练用途):
User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /` : null,
        confidence: 'Confirmed',
      }));

      items.push(createAuditItem({
        finding: googleExtBlocked ? 'Google-Extended 已被阻止' : 'Google-Extended 未被阻止',
        evidence: `Google-Extended 控制 AI 训练数据采集，但**不阻止** AI Overview 引用`,
        impact: 'Info',
        fix: null,
        confidence: 'Confirmed',
      }));

      checks.push({ check: blockedCount < policies.length, points: 10 });
    } else {
      checks.push({ check: false, points: 10 });
    }

    // 8. llms.txt
    const hasLlms = !!data.llmsTxt;
    items.push(createAuditItem({
      finding: hasLlms ? 'llms.txt 已配置' : 'llms.txt 未找到',
      evidence: hasLlms ? `llms.txt 已检测到 (${data.llmsTxt.length} 字符)` : '未检测到 /llms.txt',
      impact: 'Info', // Not yet a ranking signal
      fix: hasLlms ? null : '创建 llms.txt 以帮助 AI 系统理解您的站点 (非正式排名因子)',
      fixCode: hasLlms ? null : `# ${new URL(data.url).hostname}
> [站点简介]

## 核心页面
- [首页](${data.url}): [页面描述]
- [产品页]: [产品描述]

## 联系方式
- Email: [email]
- 官网: ${data.url}`,
      confidence: 'Confirmed',
      prompt: hasLlms ? null : `为 ${new URL(data.url).hostname} 创建一个 llms.txt 文件。该站点是一个 Fintech 平台，主要业务包括国际汇款、股票交易和加密货币交易。`,
    }));
    checks.push({ check: hasLlms, points: 5 });

    // 9. HTML Size
    const htmlSize = data.performance?.htmlSize || 0;
    const sizeOk = htmlSize < 200_000;
    items.push(createAuditItem({
      finding: `HTML 大小: ${Math.round(htmlSize / 1024)} KB`,
      evidence: `${sizeOk ? '✅ 在合理范围内' : '⚠️ 超过 200KB，可能影响爬取速度'}`,
      impact: sizeOk ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: sizeOk, points: 5 });

    // 10. Language
    const hasLang = !!data.meta?.lang;
    items.push(createAuditItem({
      finding: hasLang ? `语言标签: ${data.meta.lang}` : '语言标签缺失',
      evidence: hasLang ? `html lang="${data.meta.lang}"` : '未在 <html> 标签上设置 lang 属性',
      impact: hasLang ? 'Pass' : 'Warning',
      fix: hasLang ? null : '设置 html lang 属性',
      fixCode: hasLang ? null : `<html lang="en">`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasLang, points: 5 });

    const rawScore = scoreFromChecks(checks, 80);
    return createModuleResult('technical', rawScore, items, ['core', '2026-critical']);
  },
};
