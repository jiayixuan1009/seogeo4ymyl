// ===== SEOGEO4YMYL — LLM Orchestrator =====
// Handle API Key management and streaming responses from OpenAI-compatible endpoints.

const STORAGE_KEY = 'seogeo_llm_config';

export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

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
  return !!(config.apiKey && config.apiKey.trim().length > 0);
}

/**
 * Stream content from LLM
 * @param {string} prompt - The AI prompt to send to the LLM
 * @param {Function} onChunk - Callback triggered when a new token chunk is received: onChunk(chunkString)
 * @returns {Promise<string>} - Resolves with the complete generated string when finished
 */
export async function streamContent(prompt, onChunk) {
  const config = getLlmConfig();
  
  if (!config.apiKey) {
    throw new Error('未配置 API Key。请点击右上角【LLM 设置】进行配置。');
  }

  // Ensure Base URL doesn't have trailing slash and path is correctly appended
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const payload = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: "你是世界级的 SEO 和内容专家。你需要直接输出可执行、格式优雅的优化后内容。切忌说废话和使用套话，不需要说'好的'或'这就是结果'等前言后语，直接给出结果即可。使用 Markdown 格式排版。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    stream: true,
    temperature: 0.5,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errorMsg = errJson.error.message;
        }
      } catch (e) {} // ignore json parse errors on non-json error responses
      throw new Error(`LLM 请求失败 (${response.status}): ${errorMsg}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.substring(6); // remove 'data: '
            if (dataStr === '[DONE]') continue;
            
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          } catch (e) {
            console.warn('Error parsing stream chunk:', line, e);
          }
        }
      }
    }
    
    // Flush remaining buffer if any
    if (buffer.trim() !== '' && buffer.startsWith('data: ')) {
      try {
         const dataStr = buffer.substring(6);
         if (dataStr !== '[DONE]') {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
         }
      } catch(e) {}
    }

    return fullText;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('网络请求失败或存在跨域(CORS)拦截。请确认 Base URL 正确且支持浏览器跨域请求。');
    }
    throw error;
  }
}
