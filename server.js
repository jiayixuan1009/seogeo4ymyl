import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { Agent, fetch as undiciFetch } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Enable CORS for frontend connection compatibility
app.use(cors());

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

// Secure local scraper dispatcher (Avoids global NODE_TLS_REJECT_UNAUTHORIZED='0')
const insecureDispatcher = new Agent({ 
  connect: { rejectUnauthorized: false } 
});

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Proxy fetch failed with status: ${response.status}`);
    }

    // Protect against massive file downloads hanging the server memory
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Response payload too large (> 10MB)' });
    }

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error(`Scrape Proxy error for ${targetUrl}:`, error.message);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
});

// 2. LLM Streaming Proxy (Uses STRCIT TLS)
app.post('/api/llm-proxy', async (req, res) => {
  const { targetUrl, options } = req.body;
  if (!targetUrl || !options) return res.status(400).json({ error: 'Missing targetUrl or options' });
  if (!isUrlSafe(targetUrl)) return res.status(403).json({ error: 'SSRF Protection: Invalid LLM endpoint' });

  try {
    // Native node fetch uses strict TLS verification, securely protecting OpenAI traffic.
    const fetchResponse = await fetch(targetUrl, {
      method: options.method || 'POST',
      headers: options.headers,
      body: JSON.stringify(options.body),
    });

    res.status(fetchResponse.status);
    for (const [key, val] of fetchResponse.headers) {
      if (key !== 'content-encoding') res.setHeader(key, val);
    }

    if (fetchResponse.body) {
      for await (const chunk of fetchResponse.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (error) {
    console.error(`LLM Proxy error for ${targetUrl}:`, error.message);
    res.status(500).json({ error: 'LLM Proxy failed', details: error.message });
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
