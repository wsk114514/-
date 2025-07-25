/**
 * api.js - 前端API服务层
 * 
 * 这是前端与后端通信的统一入口，提供：
 * 1. 🌐 统一的HTTP请求封装 - 错误处理、超时控制、重试机制
 * 2. 🔄 流式响应处理 - 支持AI回复的实时流式传输
 * 3. 📁 文件上传服务 - 支持文档上传和进度追踪
 * 4. 🔐 认证API集成 - 用户登录注册接口
 * 5. 💬 对话API集成 - 多模式对话请求处理
 * 6. 🛡️ 错误恢复机制 - 网络异常的自动重试和降级
 * 
 * 技术特色:
 * - 基于 Fetch API 的现代化实现
 * - AbortController 支持请求取消
 * - 自定义错误类型和状态管理
 * - TypeScript 风格的 JSDoc 注释
 */

// ========================= API配置常量 =========================
const API_CONFIG = {
  BASE_URL: '',           // 使用相对路径，通过 Vite 代理转发到后端
  TIMEOUT: 30000,         // 请求超时时间 (30秒)
  RETRY_ATTEMPTS: 3,      // 自动重试次数
  RETRY_DELAY: 1000,      // 重试间隔 (1秒)
};

// ========================= HTTP状态码常量 =========================
const HTTP_STATUS = {
  OK: 200,                      // 请求成功
  BAD_REQUEST: 400,             // 请求参数错误
  UNAUTHORIZED: 401,            // 未授权
  FORBIDDEN: 403,               // 禁止访问
  NOT_FOUND: 404,               // 资源不存在
  INTERNAL_SERVER_ERROR: 500,   // 服务器内部错误
};

// ========================= 自定义错误类 =========================

/**
 * 自定义API错误类。
 * 扩展了原生Error，添加了HTTP状态码和附加数据，便于进行更精细的错误处理。
 */
class APIError extends Error {
  /**
   * 创建一个 APIError 实例。
   * @param {string} message - 错误消息。
   * @param {number} status - HTTP状态码。
   * @param {any} [data] - 附加的错误数据。
   */
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// ========================= 网络请求工具函数 =========================

/**
 * 带有超时控制的 fetch 封装器。
 * 如果请求在指定时间内未完成，将通过 AbortController 中断请求。
 * 
 * @param {string} url - 请求的URL。
 * @param {RequestInit} [options={}] - fetch 请求的配置选项。
 * @param {number} [timeout=API_CONFIG.TIMEOUT] - 超时时间（毫秒）。
 * @returns {Promise<Response>} 返回一个解析为 Response 对象的 Promise。
 * @throws {APIError} 如果请求超时或发生网络错误，则抛出此错误。
 */
async function fetchWithTimeout(url, options = {}, timeout = API_CONFIG.TIMEOUT) {
  // 创建 AbortController 用于取消请求
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 构建完整的URL (支持相对路径和绝对路径)
  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,  // 绑定取消信号
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // 处理不同类型的网络错误
    if (error.name === 'AbortError') {
      throw new APIError('请求超时，请稍后再试', 0);
    }
    
    // 其他网络错误
    throw new APIError(`网络请求失败: ${error.message}`, 0, error);
  }
}

/**
 * 带有重试机制的 fetch 封装器。
 * 当遇到服务器错误（5xx）时，会自动重试请求。客户端错误（4xx）不会重试。
 * 
 * @param {string} url - 请求的URL。
 * @param {RequestInit} [options={}] - fetch 请求的配置选项。
 * @param {number} [maxAttempts=API_CONFIG.RETRY_ATTEMPTS] - 最大重试次数。
 * @returns {Promise<Response>} 返回一个解析为 Response 对象的 Promise。
 * @throws {APIError} 如果所有重试尝试均失败，则抛出此错误。
 */
async function fetchWithRetry(url, options = {}, maxAttempts = API_CONFIG.RETRY_ATTEMPTS) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // 请求成功，直接返回
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
      
      // 服务器错误，准备重试
      throw new APIError(`服务器错误 (${response.status})`, response.status);
      
    } catch (error) {
      lastError = error;
      
      // 不重试客户端错误
      if (error instanceof APIError && error.status < 500) {
        throw error;
      }
      
      // 如果还有重试机会，等待后重试（指数退避）
      if (attempt < maxAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt)
        );
      }
    }
  }

  // 重试次数用尽，抛出最后的错误
  throw lastError;
}

// ========================= 对话API接口 =========================

/**
 * 标准聊天 API（已废弃，但保留兼容性）。
 * 发送单次请求并等待完整响应。
 * 
 * @deprecated 建议使用 getResponseStream 以获得更好的用户体验。
 * @param {string} message - 用户发送的消息。
 * @param {string} function_type - 对话所属的功能类型。
 * @param {string} [user_id='default'] - 用户的唯一标识符。
 * @param {Array<Object>} [chat_history=[]] - 当前的聊天历史记录。
 * @param {Array<Object>} [game_collection=[]] - 用户的游戏收藏数据。
 * @returns {Promise<string>} AI的回复内容。
 * @throws {APIError} 如果请求失败，则抛出此错误。
 */
export async function getResponse(message, function_type, user_id = 'default', chat_history = [], game_collection = []) {
  try {
    const response = await fetchWithRetry('/app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        function: function_type,
        user_id: user_id,
        chat_history: chat_history,
        game_collection: game_collection
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

/**
 * 流式响应 API。
 * 用于获取AI的流式回复，并通过回调函数实时处理数据块。
 * 
 * @param {string} message - 用户发送的消息。
 * @param {string} function_type - 对话所属的功能类型。
 * @param {function(string): void} onChunk - 处理每个数据块的回调函数。
 * @param {AbortController|null} [abortController=null] - 用于中断请求的 AbortController。
 * @param {string} [user_id='default'] - 用户的唯一标识符。
 * @param {Array<Object>} [chat_history=[]] - 当前的聊天历史记录。
 * @param {Array<Object>} [game_collection=[]] - 用户的游戏收藏数据。
 * @returns {Promise<void>} 当流结束时，Promise 完成。
 * @throws {APIError} 如果请求失败或 onChunk 回调未提供，则抛出此错误。
 */
export async function getResponseStream(message, function_type, onChunk, abortController = null, user_id = 'default', chat_history = [], game_collection = []) {
  if (!onChunk || typeof onChunk !== 'function') {
    throw new APIError('onChunk 回调函数是必需的', 0);
  }

  try {
    const requestBody = {
      message: message,
      function: function_type,
      user_id: user_id,
      chat_history: chat_history,
      game_collection: game_collection
    };
    
    console.log('API发送的请求体:', requestBody);
    console.log('API发送的chat_history长度:', chat_history.length);
    console.log('API发送的game_collection长度:', game_collection.length);
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

/**
 * 清除后端记忆 API。
 * @param {string} [functionType='current'] - 要清除记忆的功能类型。'current' 表示清除当前会话的上下文记忆。
 * @returns {Promise<Object>} 后端返回的确认信息。
 * @throws {APIError} 如果请求失败，则抛出此错误。
 */
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

/**
 * 便捷函数：清除当前功能的记忆。
 * @returns {Promise<Object>} 后端返回的确认信息。
 */
export async function clearCurrentMemory() {
  return clearMemory('current');
}

/**
 * 便捷函数：清除指定功能的记忆。
 * @param {string} functionType - 要清除记忆的功能类型。
 * @returns {Promise<Object>} 后端返回的确认信息。
 */
export async function clearFunctionMemory(functionType) {
  return clearMemory(functionType);
}

/**
 * 用户登录 API。
 * @param {Object} credentials - 包含用户登录凭证（如用户名、密码）的对象。
 * @returns {Promise<Object>} 后端返回的用户信息和token。
 * @throws {APIError} 如果登录失败，则抛出此错误。
 */
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

/**
 * 用户注册 API。
 * @param {Object} userData - 包含用户注册信息的对象。
 * @returns {Promise<Object>} 后端返回的注册结果。
 * @throws {APIError} 如果注册失败，则抛出此错误。
 */
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

/**
 * 文件上传 API。
 * @param {File} file - 要上传的文件对象。
 * @returns {Promise<Object>} 后端返回的上传结果。
 * @throws {APIError} 如果上传失败，则抛出此错误。
 */
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