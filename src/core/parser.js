// ===== SEOGEO4YMYL — HTML Parser (DOMParser) =====

import { AI_CRAWLERS } from '../utils/constants.js';

/**
 * Parse HTML into NormalizedPageData
 * @param {string} url
 * @param {string} html
 * @returns {NormalizedPageData}
 */
export function parseHtml(url, html) {
  // Performance guard: strip SVGs and limit size
  let cleaned = html;
  if (cleaned.length > 500_000) {
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  }
  if (cleaned.length > 800_000) {
    cleaned = cleaned.slice(0, 800_000) + '</body></html>';
  }

  const doc = new DOMParser().parseFromString(cleaned, 'text/html');

  return {
    url,
    source: 'live',
    meta:        extractMeta(doc, url),
    headings:    extractHeadings(doc),
    content:     extractContent(doc),
    links:       extractLinks(doc, url),
    images:      extractImages(doc),
    schemas:     extractJsonLd(doc),
    structure:   extractStructure(doc),      // NEW: tables, lists, FAQ
    security:    { isHttps: url.startsWith('https') },
    performance: { htmlSize: new Blob([html]).size },
    robots:  null,
    sitemap: null,
    llmsTxt: null,
  };
}

// === Meta Tags ===
function extractMeta(doc, url) {
  const get = (name) => doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || null;
  const canonical = doc.querySelector('link[rel="canonical"]')?.href || null;
  const robotsMeta = get('robots');
  const title = doc.querySelector('title')?.textContent?.trim() || null;

  return {
    title,
    titleLength: title?.length || 0,
    description: get('description'),
    descriptionLength: get('description')?.length || 0,
    robots: robotsMeta,
    canonical,
    ogTitle: get('og:title'),
    ogDescription: get('og:description'),
    ogImage: get('og:image'),
    ogType: get('og:type'),
    twitterCard: get('twitter:card'),
    viewport: get('viewport'),
    lang: doc.documentElement.lang || null,
  };
}

// === Headings ===
function extractHeadings(doc) {
  const grab = (tag) => [...doc.querySelectorAll(tag)].map(el => el.textContent.trim()).filter(Boolean);
  return { h1: grab('h1'), h2: grab('h2'), h3: grab('h3') };
}

// === DOM Structure (tables, lists, FAQ) ===
function extractStructure(doc) {
  const hasList  = doc.querySelectorAll('ul, ol').length > 0;
  const hasTable = doc.querySelectorAll('table').length > 0;

  // FAQ detection: FAQ schema OR DOM pattern (dt/dd pairs, or details/summary)
  const hasFaqSchema = [...doc.querySelectorAll('script[type="application/ld+json"]')].some(s => {
    try { const j = JSON.parse(s.textContent); return j['@type'] === 'FAQPage' || (j['@graph'] || []).some(n => n['@type'] === 'FAQPage'); } catch { return false; }
  });
  const hasFaqDom = doc.querySelectorAll('details > summary, [class*="faq"], [id*="faq"]').length > 0;
  const hasFaq    = hasFaqSchema || hasFaqDom;

  // Count FAQ items (Q&A pairs)
  const faqItems  = Math.max(
    doc.querySelectorAll('details').length,
    doc.querySelectorAll('[class*="faq"] [class*="question"], [class*="faq"] [class*="item"]').length,
  );

  return { hasList, hasTable, hasFaq, faqItems };
}

// === Content ===
function extractContent(doc) {
  const clone = doc.body?.cloneNode(true);
  if (!clone) return { wordCount: 0, textContent: '', lang: null, entities: [], atomicAnswers: [] };

  clone.querySelectorAll('script, style, nav, footer, header, aside, [role="navigation"], noscript')
    .forEach(el => el.remove());

  const text = clone.textContent.replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean);

  return {
    wordCount: words.length,
    textContent: text,
    lang: doc.documentElement.lang || null,
    entities: extractEntities(text),
    atomicAnswers: extractAtomicAnswers(doc),
  };
}

function extractEntities(text) {
  const pattern = /(?<=[.!?]\s+|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g;
  const freq = {};
  for (const m of text.matchAll(pattern)) {
    const e = m[1];
    freq[e] = (freq[e] || 0) + 1;
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));
}

function extractAtomicAnswers(doc) {
  const answers = [];
  doc.querySelectorAll('h2, h3').forEach(heading => {
    const next = heading.nextElementSibling;
    if (next && (next.tagName === 'P' || next.tagName === 'DIV')) {
      const wc = next.textContent.trim().split(/\s+/).length;
      if (wc >= 30 && wc <= 150) {
        answers.push({ heading: heading.textContent.trim(), wordCount: wc });
      }
    }
  });
  return answers;
}

// === Links ===
function extractLinks(doc, pageUrl) {
  const origin = new URL(pageUrl).origin;
  return [...doc.querySelectorAll('a[href]')].slice(0, 500).map(a => {
    const href = a.href;
    const isNav = !!a.closest('nav, header, [role="navigation"], .nav, .menu');
    const isFooter = !!a.closest('footer, .footer');
    return {
      href,
      text: a.textContent.trim().slice(0, 200),
      rel: a.rel || '',
      isInternal: href.startsWith(origin) || href.startsWith('/'),
      isFollow: !a.rel?.includes('nofollow'),
      context: isFooter ? 'footer' : (isNav ? 'nav' : 'body'),
    };
  });
}

// === Images ===
function extractImages(doc) {
  return [...doc.querySelectorAll('img')].slice(0, 200).map(img => ({
    src: img.src || img.dataset?.src || '',
    alt: img.alt || null,
    width: img.width || null,
    height: img.height || null,
    loading: img.loading || null,
  }));
}

// === JSON-LD ===
function extractJsonLd(doc) {
  const schemas = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const parsed = JSON.parse(script.textContent);
      if (parsed['@graph']) {
        schemas.push(...parsed['@graph']);
      } else {
        schemas.push(parsed);
      }
    } catch { /* skip malformed JSON-LD */ }
  });
  return schemas;
}

// === robots.txt Parser ===
export function parseRobotsTxt(text) {
  if (!text) return { rules: [], aiCrawlerPolicies: [], sitemapUrls: [] };

  const lines = text.split('\n');
  const rules = [];
  let currentAgent = null;

  for (const line of lines) {
    const trimmed = line.split('#')[0].trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('user-agent:')) {
      currentAgent = trimmed.slice(11).trim();
    } else if (lower.startsWith('disallow:') && currentAgent) {
      rules.push({ agent: currentAgent, directive: 'disallow', path: trimmed.slice(9).trim() });
    } else if (lower.startsWith('allow:') && currentAgent) {
      rules.push({ agent: currentAgent, directive: 'allow', path: trimmed.slice(6).trim() });
    }
  }

  const aiCrawlerPolicies = AI_CRAWLERS.map(crawler => {
    const crawlerRules = rules.filter(r => r.agent === crawler || r.agent === '*');
    const isBlocked = crawlerRules.some(r => r.directive === 'disallow' && r.path === '/' && r.agent === crawler);
    return { crawler, isBlocked, rules: crawlerRules };
  });

  const sitemapUrls = [...text.matchAll(/^Sitemap:\s*(.+)$/gmi)].map(m => m[1].trim());

  return { rules, aiCrawlerPolicies, sitemapUrls };
}

/**
 * Enrich NormalizedPageData with robots/sitemap/llms data
 */
export function enrichPageData(pageData, resources) {
  if (resources.robots?.ok) {
    pageData.robots = parseRobotsTxt(resources.robots.text);
  }
  if (resources.sitemap?.ok) {
    pageData.sitemap = resources.sitemap.text;
  }
  if (resources.llms?.ok) {
    pageData.llmsTxt = resources.llms.text;
  }
  return pageData;
}
