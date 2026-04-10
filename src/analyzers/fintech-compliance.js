// ===== SEOGEO4YMYL — Fintech/YMYL Compliance Analyzer =====

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';
import { FINTECH_REGULATION, FINTECH_RISK_DISCLOSURE } from '../utils/constants.js';

export const FintechComplianceAnalyzer = {
  id: 'fintech-compliance',
  name: 'Fintech 合规',
  icon: '💰',
  weight: 0.11,
  requiredResources: ['html'],
  sfCompatible: false,

  analyze(data) {
    const items = [];
    const checks = [];
    const text = (data.content?.textContent || '').toLowerCase();

    // 1. Regulatory License Display
    const regFound = FINTECH_REGULATION.filter(kw => text.includes(kw.toLowerCase()));
    const hasReg = regFound.length > 0;
    items.push(createAuditItem({
      finding: hasReg ? `监管牌照标识: ${regFound.length} 个` : '⚠️ 未检测到监管牌照标识',
      evidence: hasReg ? `检测到: ${regFound.join(', ')}` : '未找到 FCA, SEC, CFTC, SFC 等监管机构标记',
      impact: hasReg ? 'Pass' : 'Critical',
      fix: hasReg ? null : '在页面底部或合规页面显示监管牌照信息',
      fixCode: hasReg ? null : `<footer>
  <div class="regulatory-info">
    <p>[公司名] is regulated by [监管机构] (License No: [牌照号])</p>
    <p>Registered address: [注册地址]</p>
  </div>
</footer>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasReg, points: 15 });

    // 2. Risk Disclosure
    const riskFound = FINTECH_RISK_DISCLOSURE.filter(kw => text.includes(kw.toLowerCase()));
    const hasRisk = riskFound.length > 0;
    items.push(createAuditItem({
      finding: hasRisk ? `风险披露: ${riskFound.length} 个信号` : '⚠️ 风险披露缺失',
      evidence: hasRisk ? `检测到: ${riskFound.join(', ')}` : '未检测到 risk warning, capital at risk 等风险提示',
      impact: hasRisk ? 'Pass' : 'Critical',
      fix: hasRisk ? null : '添加符合监管要求的风险披露声明',
      fixCode: hasRisk ? null : `<div class="risk-warning" style="border-top:2px solid #ff4d6a;padding:16px;margin:24px 0;background:rgba(255,77,106,0.05)">
  <strong>⚠️ Risk Warning:</strong>
  <p>Trading financial instruments carries a high level of risk and may not be suitable for all investors.
  You could lose substantially more than your initial investment. Past performance is not indicative of future results.</p>
</div>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasRisk, points: 15 });

    // 3. Fee Transparency
    const hasFees = /fee|commission|spread|费用|手续费|佣金|汇率/.test(text);
    items.push(createAuditItem({
      finding: hasFees ? '费率信息已展示' : '费率/费用信息缺失',
      evidence: hasFees ? '页面包含费用相关说明' : '未检测到 fee, commission, spread 等费率信息',
      impact: hasFees ? 'Pass' : 'Warning',
      confidence: 'Likely',
    }));
    checks.push({ check: hasFees, points: 10 });

    // 4. Security Trust Signals
    const securityKeywords = ['ssl', 'encryption', '2fa', 'pci dss', 'soc 2', 'two-factor', '加密', '安全'];
    const secFound = securityKeywords.filter(kw => text.includes(kw));
    const hasSec = secFound.length > 0;
    items.push(createAuditItem({
      finding: hasSec ? `安全信任标记: ${secFound.length} 个` : '安全信任标记缺失',
      evidence: hasSec ? `检测到: ${secFound.join(', ')}` : '建议展示 SSL, 2FA, PCI DSS 等安全认证',
      impact: hasSec ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasSec, points: 10 });

    // 5. Disclaimer
    const hasDisclaimer = /disclaimer|not\s+financial\s+advice|免责声明|不构成投资建议/.test(text);
    items.push(createAuditItem({
      finding: hasDisclaimer ? '免责声明已设置' : '免责声明缺失',
      evidence: hasDisclaimer ? '页面包含免责声明' : '建议添加"非投资建议"免责声明',
      impact: hasDisclaimer ? 'Pass' : 'Warning',
      fixCode: hasDisclaimer ? null : `<p class="disclaimer">
  <em>Disclaimer: The information provided on this page is for informational purposes only
  and does not constitute financial advice. Please consult a qualified financial advisor
  before making investment decisions.</em>
</p>`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasDisclaimer, points: 10 });

    // 6. AML/KYC
    const hasCompliance = /aml|kyc|anti-money|know\s+your\s+customer|反洗钱|身份验证/.test(text);
    items.push(createAuditItem({
      finding: hasCompliance ? 'AML/KYC 合规标记 ✅' : 'AML/KYC 合规标记未检测到',
      evidence: hasCompliance ? '页面包含反洗钱/身份验证信息' : '建议展示合规措施',
      impact: hasCompliance ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasCompliance, points: 10 });

    // 7. 🔥 Editorial Standards (v5)
    const hasEditorial = /editorial\s*(policy|standards|guideline)|编辑政策|编辑标准/.test(text);
    items.push(createAuditItem({
      finding: hasEditorial ? '🔥 编辑标准声明 ✅' : '🔥 编辑标准声明缺失',
      evidence: hasEditorial ? '页面包含编辑标准或政策链接' : '2026 更新后，YMYL 站点应有公开的编辑标准声明',
      impact: hasEditorial ? 'Pass' : 'Warning',
      fixCode: hasEditorial ? null : `<!-- 建议创建 /editorial-policy 页面并在文章中链接 -->
<a href="/editorial-policy">Editorial Standards</a>

<!-- editorial-policy 页面内容建议: -->
<!-- 1. 内容创作流程 -->
<!-- 2. 事实核查标准 -->
<!-- 3. AI 使用政策 -->
<!-- 4. 专家审核流程 -->
<!-- 5. 更新频率 -->`,
      confidence: 'Confirmed',
      prompt: hasEditorial ? null : `为 Fintech 站点 ${data.url} 撰写编辑标准政策页面。需包含: 1) 内容创作流程 2) 事实核查标准 3) AI 辅助内容使用政策 4) 金融专家审核流程`,
    }));
    checks.push({ check: hasEditorial, points: 10 });

    // 8. 🔥 AI Transparency (v5)
    const hasAiTransparency = /ai-assisted|ai\s+disclaimer|ai辅助|ai参与/.test(text);
    items.push(createAuditItem({
      finding: hasAiTransparency ? 'AI 使用透明度 ✅' : 'AI 使用透明度未声明',
      evidence: hasAiTransparency ? '已公开说明 AI 在内容中的使用' : '建议声明 AI 内容辅助情况',
      impact: hasAiTransparency ? 'Pass' : 'Info',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasAiTransparency, points: 10 });

    // 9. Multi-Region Compliance
    const hasGeoRestriction = /not\s+available\s+in|restricted|不适用于|限制/.test(text);
    items.push(createAuditItem({
      finding: hasGeoRestriction ? '多地区合规声明 ✅' : '多地区合规声明未检测到',
      evidence: hasGeoRestriction ? '已标识地域限制' : '如有地域限制的服务，建议明确声明',
      impact: hasGeoRestriction ? 'Pass' : 'Info',
      confidence: 'Likely',
    }));
    checks.push({ check: hasGeoRestriction, points: 10 });

    const rawScore = scoreFromChecks(checks, 100);
    return createModuleResult('fintech-compliance', rawScore, items, ['ymyl', '2026-critical']);
  },
};
