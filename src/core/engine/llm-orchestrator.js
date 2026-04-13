// ===== SEOGEO4YMYL — LLM Orchestrator =====
// Handle API Key management and streaming responses from OpenAI-compatible endpoints.

const STORAGE_KEY = 'seogeo_llm_config';

export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.deepseek.com/v1',  // DeepSeek 默认——支持浏览器直接调用
  apiKey: '',
  model: 'deepseek-chat',
};

// Server-side /api/llm-proxy only forwards to allowlisted hosts (see server.js).
// Custom OpenAI-compatible hosts: set env LLM_ALLOWED_HOSTS_EXTRA=host.example.com on the Node server.

// Known providers and their CORS support
// OpenAI official: NO browser CORS (needs backend proxy)
// DeepSeek:        YES — https://api.deepseek.com/v1
// Kimi (MoonshotAI): YES — https://api.moonshot.cn/v1
// 阿里百炼:          YES — https://dashscope.aliyuncs.com/compatible-mode/v1
// Gemini (OpenAI compat): YES — https://generativelanguage.googleapis.com/v1beta/openai
export const PROVIDER_PRESETS = [
  { name: 'DeepSeek',   baseUrl: 'https://api.deepseek.com/v1',                               model: 'deepseek-chat',          note: '推荐 · 浏览器直调' },
  { name: 'Kimi',       baseUrl: 'https://api.moonshot.cn/v1',                                model: 'moonshot-v1-8k',          note: '浏览器直调' },
  { name: '阿里百炼',   baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',         model: 'qwen-plus',               note: '浏览器直调' },
  { name: 'Gemini',     baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',   model: 'gemini-2.0-flash',        note: '浏览器直调' },
  { name: 'OpenAI',     baseUrl: 'https://api.openai.com/v1',                                 model: 'gpt-4o-mini',             note: '需后端代理' },
];

/**
 * Get LLM configuration from LocalStorage
 */
export function getLlmConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse LLM config:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save LLM configuration to LocalStorage
 */
export function saveLlmConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Check if the LLM environment is configured
 */
export function isLlmConfigured() {
  const config = getLlmConfig();
  return !!(config.baseUrl && config.baseUrl.trim().length > 0);
}

/**
 * Detect if a base URL is known to block browser CORS
 */
function isCorsBlocked(baseUrl) {
  return baseUrl.includes('api.openai.com');  // Official OpenAI blocks browser fetch
}

/**
 * Stream content from LLM
 */
export async function streamContent(prompt, onChunk) {
  const config = getLlmConfig();

  const baseUrl  = config.baseUrl.replace(/\/$/, '');
  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const payload = {
    model: config.model || DEFAULT_CONFIG.model,
    messages: [
      {
        role: 'system',
        content: '你是世界级的 SEO 和内容专家。直接输出可执行的优化后内容，禁止输出前言后语（如"好的"、"这是结果"），直接给出结果。',
      },
      { role: 'user', content: prompt },
    ],
    stream: true,
    temperature: 0.5,
  };

  let response;
  try {
    // ALWAYS route via our private Node proxy to securely inject API keys server-side
    response = await fetch('/api/llm-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: endpoint,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        }
      }),
    });
  } catch (fetchErr) {
    throw new Error(
      `网络请求失败 (${fetchErr.message})。\n` +
      `请确认 Base URL 正确（当前：${baseUrl}），或确认服务端代理运行正常。`
    );
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson?.error?.message || errJson?.message || errorMsg;
    } catch (_) {}
    throw new Error(`LLM 接口返回错误: ${errorMsg}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText  = '';
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!line.startsWith('data: ')) continue;

      try {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;
        const json    = JSON.parse(dataStr);
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          if (onChunk) onChunk(content);
        }
      } catch (_) {}
    }
  }

  // Flush remaining buffer
  if (buffer.startsWith('data: ')) {
    try {
      const dataStr = buffer.slice(6);
      if (dataStr !== '[DONE]') {
        const json    = JSON.parse(dataStr);
        const content = json.choices?.[0]?.delta?.content;
        if (content) { fullText += content; if (onChunk) onChunk(content); }
      }
    } catch (_) {}
  }

  return fullText;
}
