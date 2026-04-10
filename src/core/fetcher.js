// ===== SEOGEO4YMYL — CORS Proxy Fetch Engine =====

import { CORS_PROXIES, FETCH_TIMEOUT_MS, MAX_CONCURRENT_REQUESTS } from '../utils/constants.js';

// === Semaphore for concurrency control ===
class Semaphore {
  #queue = [];
  #active = 0;
  constructor(max) { this.max = max; }

  async acquire() {
    if (this.#active < this.max) { this.#active++; return; }
    return new Promise(resolve => this.#queue.push(resolve));
  }

  release() {
    this.#active--;
    if (this.#queue.length > 0) { this.#active++; this.#queue.shift()(); }
  }
}

const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);
const responseCache = new Map();

class FetchError extends Error {
  constructor(message, url) {
    super(message);
    this.name = 'FetchError';
    this.url = url;
  }
}

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then(res => {
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .catch(err => {
      clearTimeout(timer);
      throw err;
    });
}

/**
 * Fetch a single URL through CORS proxy chain with fallback
 * @param {string} url - Target URL
 * @returns {Promise<string>} - Response text
 */
export async function fetchUrl(url) {
  if (responseCache.has(url)) return responseCache.get(url);

  await semaphore.acquire();
  try {
    for (const proxy of CORS_PROXIES) {
      try {
        const result = await fetchWithTimeout(proxy.url(url), FETCH_TIMEOUT_MS);
        responseCache.set(url, result);
        return result;
      } catch (err) {
        console.warn(`[Fetcher] ${proxy.name} failed for ${url}:`, err.message);
        continue;
      }
    }
    throw new FetchError(`All ${CORS_PROXIES.length} proxies failed for ${url}`, url);
  } finally {
    semaphore.release();
  }
}

/**
 * Fetch all required resources for a site
 * @param {string} baseUrl - Page URL
 * @param {string[]} requiredResources - ['html', 'robots', 'sitemap', 'llms']
 * @returns {Promise<Object>}
 */
export async function fetchSiteResources(baseUrl, requiredResources = ['html', 'robots', 'sitemap', 'llms']) {
  const origin = new URL(baseUrl).origin;
  const targets = {
    html:     baseUrl,
    robots:   `${origin}/robots.txt`,
    sitemap:  `${origin}/sitemap.xml`,
    llms:     `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
  };

  const tasks = requiredResources.map(async (key) => {
    try {
      const text = await fetchUrl(targets[key] || targets.html);
      return [key, { ok: true, text }];
    } catch (err) {
      return [key, { ok: false, error: err.message }];
    }
  });

  return Object.fromEntries(await Promise.all(tasks));
}

/**
 * Clear cache (e.g., before re-scan)
 */
export function clearFetchCache() {
  responseCache.clear();
}
