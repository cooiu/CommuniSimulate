/**
 * API服务
 *
 * 集中管理所有与后端API的通信
 */

// 从环境变量获取API基础URL，默认为本地开发服务器
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// 会话ID存储键
const SESSION_ID_KEY = 'codeSessionId';

/**
 * 创建新会话
 * @returns {Promise<string>} 创建的会话ID
 */
export async function createSession() {
  try {
    // 生成随机会话ID
    const sessionId = `session_${Math.random().toString(36).substring(2, 10)}`;

    const response = await fetch(`${API_BASE_URL}/create_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 保存会话ID到localStorage
    localStorage.setItem(SESSION_ID_KEY, sessionId);

    const data = await response.json();
    console.log('会话创建成功:', data);
    return sessionId;

  } catch (error) {
    console.error('创建会话失败:', error);
    throw error;
  }
}

/**
 * 执行代码
 * @param {string} code 要执行的代码
 * @returns {Promise<Object>} 执行结果
 */
export async function executeCode(code) {
  try {
    // 从localStorage获取会话ID
    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      throw new Error('没有有效的会话ID，请先创建会话');
    }

    // 发送请求
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        code: code
      })
    });

    // 检查状态
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 解析响应
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API调用错误:', error);
    throw error;
  }
}

/**
 * 终止会话
 * @returns {Promise<Object>} 终止结果
 */
export async function terminateSession() {
  try {
    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      console.warn('没有会话ID，无需终止');
      return { success: true };
    }

    const response = await fetch(`${API_BASE_URL}/terminate_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });

    // 无论成功与否，都清除本地存储的会话ID
    localStorage.removeItem(SESSION_ID_KEY);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('终止会话失败:', error);
    // 即使出错也清除会话ID
    localStorage.removeItem(SESSION_ID_KEY);
    throw error;
  }
}

/**
 * 清除会话ID
 */
export function clearSession() {
  localStorage.removeItem(SESSION_ID_KEY);
}

export default {
  createSession,
  executeCode,
  terminateSession,
  clearSession
};
