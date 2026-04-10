// ===== SEOGEO4YMYL — Domain Authority Analyzer =====

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const DomainAuthorityAnalyzer = {
  id: 'domain-authority',
  name: '域名权威',
  icon: '🏛️',
  weight: 0.05,
  requiredResources: ['html', 'robots'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];
    const text = (data.content?.textContent || '').toLowerCase();
    const url = data.url;
    let hostname = '';
    try { hostname = new URL(url).hostname; } catch { hostname = url; }

    // 1. HTTPS
    const isHttps = data.security?.isHttps;
    items.push(createAuditItem({
      finding: isHttps ? 'HTTPS ✅' : 'HTTPS ❌',
      evidence: isHttps ? '安全连接已启用' : '缺少 HTTPS，严重影响信任度',
      impact: isHttps ? 'Pass' : 'Critical',
      confidence: 'Confirmed',
    }));
    checks.push({ check: isHttps, points: 15 });

    // 2. About/Contact Page Links (E-E-A-T Nav/Footer Reachability)
    const links = data.links || [];
    const isTrustContext = (l) => l.context === 'nav' || l.context === 'footer';
    const hasAbout = links.some(l => isTrustContext(l) && (/about|关于/i.test(l.href) || /about|关于/i.test(l.text)));
    const hasContact = links.some(l => isTrustContext(l) && (/contact|联系/i.test(l.href) || /contact|联系/i.test(l.text)));

    items.push(createAuditItem({
      finding: `E-E-A-T 信任页可达性 (关于: ${hasAbout ? '✅' : '❌'}, 联系: ${hasContact ? '✅' : '❌'})`,
      evidence: (hasAbout && hasContact) 
        ? '全局导航 (Nav) 或页脚 (Footer) 中包含关于和联系入口' 
        : '未在核心导航区(Nav/Footer)检测到 About/Contact 链接。这对 YMYL 站点是非常负面的弱信任信号。',
      impact: (hasAbout && hasContact) ? 'Pass' : 'Critical',
      fix: (hasAbout && hasContact) ? null : '需将关于和联系页面的链接加入全局导航或页脚',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasAbout, points: 12 });
    checks.push({ check: hasContact, points: 12 });

    // 3. Privacy Policy / Terms (Legal Nav/Footer Reachability)
    const hasPrivacy = links.some(l => isTrustContext(l) && (/privacy|隐私/i.test(l.href) || /privacy|隐私/i.test(l.text)));
    const hasTerms = links.some(l => isTrustContext(l) && (/terms|条款/i.test(l.href) || /terms|条款/i.test(l.text)));
    
    items.push(createAuditItem({
      finding: `法律页面可达性 (隐私: ${hasPrivacy ? '✅' : '❌'}, 条款: ${hasTerms ? '✅' : '❌'})`,
      evidence: (hasPrivacy && hasTerms) 
        ? '核心导航区包含完整的法律声明入口' 
        : '未在页脚或导航处检测到隐私政策/服务条款链接',
      impact: (hasPrivacy && hasTerms) ? 'Pass' : 'Warning',
      fix: (hasPrivacy && hasTerms) ? null : '需将 Privacy Policy 和 Terms of Service 链接加入全局页脚',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasPrivacy, points: 10 });
    checks.push({ check: hasTerms, points: 10 });

    // 4. Copyright
    const hasCopyright = /©|copyright|\d{4}/.test(text);
    items.push(createAuditItem({
      finding: hasCopyright ? '版权声明 ✅' : '版权声明缺失',
      evidence: hasCopyright ? '检测到版权标记' : '建议添加版权声明',
      impact: hasCopyright ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasCopyright, points: 8 });

    // 5. Domain age hint (via copyright year)
    const yearMatch = text.match(/(?:©|copyright)\s*(\d{4})/i);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const age = new Date().getFullYear() - year;
      items.push(createAuditItem({
        finding: `推测域名年龄: ${age > 0 ? `~${age} 年` : '今年注册'}`,
        evidence: `基于版权年份 ${year} 推测`,
        impact: age >= 3 ? 'Pass' : 'Info',
        confidence: 'Hypothesis',
      }));
      checks.push({ check: age >= 2, points: 8 });
    }

    // 6. robots.txt
    const hasRobots = !!data.robots;
    items.push(createAuditItem({
      finding: hasRobots ? 'robots.txt 配置完整' : 'robots.txt 缺失',
      evidence: hasRobots ? `${data.robots.rules?.length || 0} 条规则` : '影响搜索引擎对站点的理解',
      impact: hasRobots ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasRobots, points: 10 });

    items.push(createAuditItem({
      finding: '⚠️ 完整的域名权威评估需要外部 API',
      evidence: 'Domain Rating (DR), Domain Authority (DA), Backlink Profile 等需要 Ahrefs/Moz API',
      impact: 'Info',
      confidence: 'Confirmed',
    }));

    const rawScore = scoreFromChecks(checks, 75);
    return createModuleResult('domain-authority', rawScore, items, ['limited-frontend']);
  },
};
