/**
 * helpers.js - 通用工具函数集合
 * 
 * 提供项目中可重用的、与特定业务逻辑无关的辅助函数。
 * 包括但不限于：
 * - 时间格式化
 * - 唯一ID生成
 * - 数据处理（深拷贝、防抖、节流）
 * - 文件处理（大小格式化、类型验证）
 * - 安全性与错误处理
 * - DOM与浏览器交互（剪贴板、设备检测）
 */

/**
 * 格式化日期对象或时间戳为可读字符串。
 * @param {Date|string|number} date - 需要格式化的日期对象、ISO字符串或时间戳。
 * @param {string} [format='datetime'] - 格式化类型。可选值为 'datetime', 'date', 'time'。
 * @returns {string} 格式化后的日期时间字符串。如果输入无效，则返回 '无效日期'。
 */
export function formatTime(date, format = 'datetime') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '无效日期';
  }

  const options = {
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    },
    date: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return d.toLocaleString('zh-CN', options[format] || options.datetime);
}

/**
 * 生成一个基于前缀、时间戳和随机数的唯一标识符。
 * @param {string} [prefix='id'] - ID的前缀。
 * @returns {string} 生成的唯一ID，格式如 'prefix-timestamp-random'。
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深拷贝一个对象或数组，处理了基本类型、Date对象和嵌套结构。
 * @param {any} obj - 需要深拷贝的源对象。
 * @returns {any} 完全独立的深拷贝副本。
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 创建一个防抖函数，延迟执行以避免函数被频繁调用。
 * @param {Function} func - 需要进行防抖处理的函数。
 * @param {number} wait - 延迟执行的毫秒数。
 * @param {boolean} [immediate=false] - 是否在延迟开始前立即执行一次。
 * @returns {Function} 返回一个具有防抖功能的新函数。
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * 创建一个节流函数，在指定的时间间隔内最多执行一次。
 * @param {Function} func - 需要进行节流处理的函数。
 * @param {number} limit - 两次执行之间的最小时间间隔（毫秒）。
 * @returns {Function} 返回一个具有节流功能的新函数。
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 检查一个值是否为空。
 * 空值定义为：null, undefined, 空数组, 空字符串, 或没有可枚举属性的空对象。
 * @param {any} value - 需要检查的值。
 * @returns {boolean} 如果值为空则返回 true，否则返回 false。
 */
export function isEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 将文件大小（字节）格式化为更易读的单位（KB, MB, GB等）。
 * @param {number} bytes - 文件大小的字节数。
 * @param {number} [decimals=2] - 保留的小数位数。
 * @returns {string} 格式化后的文件大小字符串，例如 "1.23 MB"。
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 验证文件名后缀是否在允许的类型列表中。
 * @param {string} fileName - 包含扩展名的完整文件名。
 * @param {string[]} allowedTypes - 允许的文件扩展名数组（例如 ['pdf', 'txt']）。
 * @returns {boolean} 如果文件类型有效则返回 true，否则返回 false。
 */
export function isValidFileType(fileName, allowedTypes) {
  if (!fileName || !allowedTypes?.length) return false;
  
  const extension = fileName.toLowerCase().split('.').pop();
  return allowedTypes.some(type => type.toLowerCase().includes(extension));
}

/**
 * 安全地解析JSON字符串，如果解析失败则返回一个默认值。
 * @param {string} jsonString - 需要解析的JSON字符串。
 * @param {any} [defaultValue=null] - 解析失败时返回的默认值。
 * @returns {any} 解析后的JavaScript对象，或在失败时返回默认值。
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 从各种可能的错误对象中提取一条可读的错误消息。
 * @param {Error|string|any} error - 错误对象、字符串或其他类型。
 * @returns {string} 提取出的错误消息字符串。
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.detail) {
    return error.detail;
  }
  
  return '未知错误';
}

/**
 * 异步将文本复制到用户的剪贴板，优先使用现代API。
 * @param {string} text - 需要复制到剪贴板的文本。
 * @returns {Promise<boolean>} 如果复制成功，Promise解析为 true，否则为 false。
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 备用方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

/**
 * 通过检查用户代理字符串来判断当前设备是否为移动设备。
 * @returns {boolean} 如果是移动设备则返回 true，否则返回 false。
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 生成一个随机的十六进制颜色代码。
 * @returns {string} 一个随机的CSS颜色值，例如 '#a3b4c5'。
 */
export function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * 如果字符串超过指定长度，则截断并在末尾添加后缀。
 * @param {string} str - 需要截断的原始字符串。
 * @param {number} [length=100] - 允许的最大长度。
 * @param {string} [suffix='...'] - 截断后附加的后缀。
 * @returns {string} 处理后的字符串。
 */
export function truncateString(str, length = 100, suffix = '...') {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + suffix;
}
