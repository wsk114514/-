/**
 * helpers.js - 通用工具函数集合
 * 
 * 负责提供项目中常用的工具函数，如时间格式化、数据处理等
 */

// 常用工具函数集合

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式 ('datetime', 'date', 'time')
 * @returns {string} 格式化后的时间字符串
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
 * 生成唯一ID
 * @param {string} prefix - 前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
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
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
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
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制间隔
 * @returns {Function} 节流后的函数
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
 * 检查是否为空值
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为空
 */
export function isEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
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
 * 检查文件类型
 * @param {string} fileName - 文件名
 * @param {string[]} allowedTypes - 允许的类型
 * @returns {boolean} 是否为允许的类型
 */
export function isValidFileType(fileName, allowedTypes) {
  if (!fileName || !allowedTypes?.length) return false;
  
  const extension = fileName.toLowerCase().split('.').pop();
  return allowedTypes.some(type => type.toLowerCase().includes(extension));
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {any} defaultValue - 默认值
 * @returns {any} 解析结果
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
 * 获取错误消息
 * @param {Error|string|any} error - 错误对象
 * @returns {string} 错误消息
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
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
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
 * 检查是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 生成随机颜色
 * @returns {string} 十六进制颜色值
 */
export function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * 字符串截断
 * @param {string} str - 字符串
 * @param {number} length - 最大长度
 * @param {string} suffix - 后缀
 * @returns {string} 截断后的字符串
 */
export function truncateString(str, length = 100, suffix = '...') {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + suffix;
}
