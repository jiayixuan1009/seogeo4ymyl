import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { Agent, fetch as undiciFetch } from 'undici';
import dotenv from 'dotenv';

// Force override to prevent PM2 cluster from caching old API keys indefinitely
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Behind nginx / vite proxy: use X-Forwarded-* for client IP (rate limit). Set TRUST_PROXY=0 to disable.
if (process.env.TRUST_PROXY !== '0') {
  app.set('trust proxy', 1);
}

// ==========================================
// 🛡️ SECURITY & RELIABILITY CONFIGURATION
// ==========================================

// 1. Hide Express fingerprint
app.disable('x-powered-by');

// 2. Global Rate Limiter to prevent Open Relay DDoSing
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Enable CORS for frontend connection compatibility (restricted to known origins)
const allowedOrigins = [
  'https://seo.cryptooptiontool.com',
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and matched origins
    if (!origin || allowedOrigins.some(o => o instanceof RegExp ? o.test(origin) : o === origin)) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
}));

// Setup JSON body parsing with strict size limits (5MB max for LLM prompts)
app.use(express.json({ limit: '5mb' }));

// ==========================================
// 🛡️ SSRF PROTECTION LOGIC
// ==========================================
// Safelist approach covering common internal and cloud metadata IPs
const FORBIDDEN_HOSTS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /localhost/i, /\.local$/i, /\[::\]/
];

const MAX_PROXY_BODY_BYTES = 10 * 1024 * 1024;

/** OpenAI-compatible chat endpoints only — matches PROVIDER_PRESETS in llm-orchestrator.js */
const DEFAULT_LLM_HOSTS = [
  'api.deepseek.com',
  'api.moonshot.cn',
  'dashscope.aliyuncs.com',
  'generativelanguage.googleapis.com',
  'api.openai.com',
];

function getAllowedLlmHostSet() {
  const extra = (process.env.LLM_ALLOWED_HOSTS_EXTRA || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_LLM_HOSTS.map((h) => h.toLowerCase()), ...extra]);
}

const ALLOWED_LLM_HOSTS = getAllowedLlmHostSet();

function isUrlSafe(targetUrl) {
  try {
    const urlObj = new URL(targetUrl);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return false;

    const hostname = urlObj.hostname;
    for (const regex of FORBIDDEN_HOSTS) {
      if (regex.test(hostname)) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * P0: Only forward server-side API keys to known LLM provider hosts.
 * Path must be .../chat/completions (OpenAI-compatible).
 */
function isAllowedLlmTargetUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    if (!ALLOWED_LLM_HOSTS.has(u.hostname.toLowerCase())) return false;
    const p = u.pathname.replace(/\/+$/, '') || '/';
    if (!p.endsWith('/chat/completions')) return false;
    return true;
  } catch (e) {
    return false;
  }
}

async function readResponseBodyWithLimit(response, maxBytes) {
  if (!response.body) return '';
  let total = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      const err = new Error('RESPONSE_TOO_LARGE');
      err.code = 'RESPONSE_TOO_LARGE';
      throw err;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function clientSafeError(_error) {
  return { error: 'Request failed' };
}

// Secure local scraper dispatcher (Avoids global NODE_TLS_REJECT_UNAUTHORIZED='0')
const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

const MAX_LLM_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB cap for LLM streaming responses

// ==========================================
// 🌐 PROXY ENDPOINTS
// ==========================================

// 1. Web Scraping Proxy
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) return res.status(400).json({ error: 'Missing "url" query parameter' });
  if (!isUrlSafe(targetUrl)) return res.status(403).json({ error: 'SSRF Protection: Forbidden target URL' });

  try {
    const response = await undiciFetch(targetUrl, {
      dispatcher: insecureDispatcher, // Scrape broken SSL sites securely without exposing process
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Proxy fetch failed with status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_PROXY_BODY_BYTES) {
      return res.status(413).json({ error: 'Response payload too large (> 10MB)' });
    }

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const text = await readResponseBodyWithLimit(response, MAX_PROXY_BODY_BYTES);
    res.send(text);
  } catch (error) {
    console.error(`Scrape Proxy error for ${targetUrl} (insecure TLS):`, error.message);
    if (error.code === 'RESPONSE_TOO_LARGE') {
      return res.status(413).json({ error: 'Response payload too large (> 10MB)' });
    }
    res.status(500).json(clientSafeError(error));
  }
});

// 2. LLM Streaming Proxy (Uses strict TLS)
app.post('/api/llm-proxy', async (req, res) => {
  const { targetUrl, options } = req.body;
  if (!targetUrl || !options) return res.status(400).json({ error: 'Missing targetUrl or options' });
  if (!isUrlSafe(targetUrl)) return res.status(403).json({ error: 'SSRF Protection: Invalid LLM endpoint' });
  if (!isAllowedLlmTargetUrl(targetUrl)) {
    return res.status(403).json({
      error: 'LLM proxy: endpoint not allowed',
      hint: 'Use a built-in provider Base URL or set LLM_ALLOWED_HOSTS_EXTRA on the server.',
    });
  }

  try {
    const headers = { ...(options.headers || {}) };
    const rawKey = process.env.LLM_API_KEY || 'sk-none';
    const serverPresetKey = rawKey.trim().replace(/['"]/g, '');
    headers['Authorization'] = `Bearer ${serverPresetKey}`;

    const fetchResponse = await fetch(targetUrl, {
      method: options.method || 'POST',
      headers,
      body: JSON.stringify(options.body),
    });

    res.status(fetchResponse.status);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (fetchResponse.body) {
      let llmBytes = 0;
      for await (const chunk of fetchResponse.body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        llmBytes += buf.length;
        if (llmBytes > MAX_LLM_RESPONSE_BYTES) {
          console.warn(`LLM response exceeded ${MAX_LLM_RESPONSE_BYTES} bytes, truncating`);
          res.end();
          return;
        }
        res.write(buf);
      }
    }
    res.end();
  } catch (error) {
    console.error(`LLM Proxy error for ${targetUrl}:`, error.message);
    res.status(500).json(clientSafeError(error));
  }
});

// ==========================================
// 🖥️ FRONTEND SERVING
// ==========================================
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Last line of defense exception handler
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🛡️ SEOGEO4YMYL Server Secured & Running`);
  console.log(`🚀 Port: ${PORT} | Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👉 UI reachable at: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
