// ===== SEOGEO4YMYL — Performance Analyzer =====

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const PerformanceAnalyzer = {
  id: 'performance',
  name: '性能',
  icon: '⚡',
  weight: 0.06,
  requiredResources: ['html'],
  sfCompatible: true,

  analyze(data) {
    const items = [];
    const checks = [];

    // 1. HTML Size
    const size = data.performance?.htmlSize || 0;
    const sizeKB = Math.round(size / 1024);
    const sizeOk = size < 200_000;
    items.push(createAuditItem({
      finding: `HTML 大小: ${sizeKB} KB`,
      evidence: sizeOk ? '在合理范围 (<200KB)' : '超过 200KB，可能影响首次加载',
      impact: sizeOk ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: sizeOk, points: 15 });
    checks.push({ check: size < 100_000, points: 10 });

    // 2. Image lazy loading
    const images = data.images || [];
    const lazyImages = images.filter(i => i.loading === 'lazy');
    const lazyRatio = images.length > 0 ? lazyImages.length / images.length : 1;
    const lazyOk = lazyRatio >= 0.5 || images.length <= 3;
    items.push(createAuditItem({
      finding: `图片 Lazy Loading: ${lazyImages.length}/${images.length}`,
      evidence: `${Math.round(lazyRatio * 100)}% 使用了 loading="lazy"`,
      impact: lazyOk ? 'Pass' : 'Warning',
      fix: lazyOk ? null : '为非首屏图片添加 loading="lazy" 属性',
      fixCode: lazyOk ? null : `<!-- 为非首屏图片添加 -->
<img src="image.jpg" alt="描述" loading="lazy" width="800" height="600" />`,
      confidence: 'Confirmed',
    }));
    checks.push({ check: lazyOk, points: 15 });

    // 3. Image dimensions
    const imgWithDims = images.filter(i => i.width && i.height);
    const dimsOk = images.length === 0 || imgWithDims.length / images.length >= 0.7;
    items.push(createAuditItem({
      finding: `图片尺寸标注: ${imgWithDims.length}/${images.length}`,
      evidence: dimsOk ? '大部分图片有 width/height (防止 CLS)' : '缺少尺寸会导致布局偏移',
      impact: dimsOk ? 'Pass' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: dimsOk, points: 10 });

    // 4. Excessive DOM nodes (estimated)
    const linkCount = (data.links || []).length;
    const imgCount = images.length;
    const estimatedNodes = linkCount + imgCount + (data.headings?.h2?.length || 0) * 10;
    const domOk = estimatedNodes < 1500;
    items.push(createAuditItem({
      finding: `估算 DOM 复杂度: ~${estimatedNodes} 元素`,
      evidence: domOk ? '页面复杂度在合理范围' : '页面可能过于复杂，影响渲染性能',
      impact: domOk ? 'Pass' : 'Info',
      confidence: 'Hypothesis',
    }));
    checks.push({ check: domOk, points: 10 });

    // 5. Inline scripts/CSS (estimated)
    const htmlStr = data.content?.textContent?.length || 0;
    const ratio = data.performance?.htmlSize > 0 ? htmlStr / data.performance.htmlSize : 0;
    const codeHeavy = ratio < 0.3; // If text is <30% of HTML, too much code
    items.push(createAuditItem({
      finding: `内容/代码比: ${Math.round(ratio * 100)}%`,
      evidence: codeHeavy ? '文本内容占 HTML 比例过低，可能有过多内联脚本/样式' : '内容占比合理',
      impact: codeHeavy ? 'Warning' : 'Pass',
      confidence: 'Hypothesis',
    }));
    checks.push({ check: !codeHeavy, points: 10 });

    // 6. Response time (SF data only)
    if (data.performance?.responseTime) {
      const rt = data.performance.responseTime;
      const rtOk = rt < 1.0;
      items.push(createAuditItem({
        finding: `服务器响应时间: ${rt.toFixed(2)}s`,
        evidence: rtOk ? '响应速度良好 (<1s)' : '响应较慢，可能影响爬取效率',
        impact: rtOk ? 'Pass' : 'Warning',
        confidence: 'Confirmed',
      }));
      checks.push({ check: rtOk, points: 10 });
    }

    // 7. PageSpeed Insights (PSI) API Integration
    items.push(createAuditItem({
      finding: '🚀 Core Web Vitals (PSI) 检查未执行',
      evidence: '纯前端性能检测有局限性。你可以通过连接 Google PageSpeed Insights API 获取真实的 LCP, CLS, INP 数据。',
      impact: 'Info',
      fix: '在设置中配置 PSI API Key，或生成代码以通过服务器端自动化该检测',
      llmReviewRequired: true,
      prompt: `为 ${data.url} 编写一段 JavaScript (基于 Fetch API)，调用 Google PageSpeed Insights API 获取它的 Core Web Vitals 数据 (LCP, FID, CLS, INP) 和 Lighthouse 评分。`,
      confidence: 'Confirmed',
    }));

    const rawScore = scoreFromChecks(checks, 70);
    return createModuleResult('performance', rawScore, items, ['core']);
  },
};
