// API 服务模块 - 统一处理前端与后端的通信

// API 配置
const API_CONFIG = {
  BASE_URL: '',  // 使用相对路径，通过 Vite 代理转发到后端
  TIMEOUT: 30000, // 30秒超时
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1秒
};

// HTTP 状态码
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// 自定义错误类
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// 通用的 fetch 包装器
async function fetchWithTimeout(url, options = {}, timeout = API_CONFIG.TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 构建完整的URL
  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError('请求超时，请稍后再试', 0);
    }
    throw error;
  }
}

// 重试机制
async function fetchWithRetry(url, options = {}, maxAttempts = API_CONFIG.RETRY_ATTEMPTS) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // 如果是客户端错误（4xx），不重试
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.detail || `请求失败 (${response.status})`,
          response.status,
          errorData
        );
      }
      
      throw new APIError(`服务器错误 (${response.status})`, response.status);
    } catch (error) {
      lastError = error;
      
      if (error instanceof APIError && error.status < 500) {
        throw error; // 不重试客户端错误
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt)
        );
      }
    }
  }

  throw lastError;
}

// 标准聊天 API（已废弃，但保留兼容性）
export async function getResponse(message, function_type, user_id = 'default') {
  try {
    const response = await fetchWithRetry('/app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        function: function_type,
        user_id: user_id
      }),
    });

    const data = await response.json();
    return data.response || '抱歉，我没有理解您的问题。';
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || '网络请求失败，请检查后端服务', 0);
  }
}

// 流式响应 API
export async function getResponseStream(message, function_type, onChunk, abortController = null, user_id = 'default') {
  if (!onChunk || typeof onChunk !== 'function') {
    throw new APIError('onChunk 回调函数是必需的', 0);
  }

  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        function: function_type,
        user_id: user_id
      }),
    };

    // 如果提供了 AbortController，添加 signal
    if (abortController) {
      fetchOptions.signal = abortController.signal;
    }

    const response = await fetchWithRetry('/app/stream', fetchOptions);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // 流式处理配置
    const streamConfig = {
      charDelay: { min: 20, max: 40 }, // 字符间延迟
      chunkDelay: 30, // 块间延迟
      batchSize: 3, // 批处理大小
    };

    // 批处理队列
    let chunkQueue = [];
    let isProcessing = false;
    let isAborted = false;

    // 监听中止信号
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        isAborted = true;
        reader.cancel();
      });
    }

    // 处理字符队列
    const processCharQueue = async (chars) => {
      for (let i = 0; i < chars.length; i++) {
        if (isAborted) break;
        
        onChunk(chars[i]);
        
        // 为每个字符添加随机延迟
        if (i < chars.length - 1) {
          const delay = Math.random() * 
            (streamConfig.charDelay.max - streamConfig.charDelay.min) + 
            streamConfig.charDelay.min;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    // 处理块队列
    const processQueue = async () => {
      if (isProcessing || isAborted) return;
      isProcessing = true;

      while (chunkQueue.length > 0 && !isAborted) {
        const batch = chunkQueue.splice(0, streamConfig.batchSize);
        const batchText = batch.join('');
        
        await processCharQueue(batchText);
        
        // 批次间延迟
        if (chunkQueue.length > 0 && !isAborted) {
          await new Promise(resolve => setTimeout(resolve, streamConfig.chunkDelay));
        }
      }

      isProcessing = false;
    };

    try {
      while (true && !isAborted) {
        const { done, value } = await reader.read();
        if (done || isAborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (isAborted) break;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // 等待队列处理完成
              while (chunkQueue.length > 0 || isProcessing) {
                if (isAborted) break;
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                chunkQueue.push(parsed.content);
                processQueue(); // 异步处理队列
              } else if (parsed.error) {
                throw new APIError(parsed.error, 0);
              }
            } catch (parseError) {
              console.error("解析响应数据失败:", parseError);
            }
          }
        }
      }
    } finally {
      if (reader) {
        reader.releaseLock();
      }
    }
  } catch (error) {
    // 如果是用户主动中止，不抛出错误
    if (abortController && abortController.signal.aborted) {
      return;
    }
    
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || '流式请求失败', 0);
  }
}

// 清除记忆 API
export async function clearMemory(functionType = 'current') {
  try {
    let url = '/memory/clear';
    if (functionType !== 'current') {
      url = `/memory/clear/${functionType}`;
    }
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    // 如果是 404 错误，说明后端可能没有这个接口
    if (error instanceof APIError && error.status === 404) {
      console.warn('清除记忆接口不可用，可能后端未实现此功能');
      return { message: '清除记忆接口不可用' };
    }
    
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('清除记忆失败', 0);
  }
}

// 清除当前功能记忆
export async function clearCurrentMemory() {
  return clearMemory('current');
}

// 清除指定功能记忆
export async function clearFunctionMemory(functionType) {
  return clearMemory(functionType);
}

// 用户认证 API
export async function loginUser(credentials) {
  try {
    const response = await fetchWithRetry('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('登录失败', 0);
  }
}

export async function registerUser(userData) {
  try {
    const response = await fetchWithRetry('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('注册失败', 0);
  }
}

// 文件上传 API
export async function uploadFile(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithRetry('/upload', {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('文件上传失败', 0);
  }
}

// 导出错误类供外部使用
export { APIError };