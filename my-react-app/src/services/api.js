/**
 * 调用后端接口获取AI回复
 */
export async function getResponse(message, function_type) {
  const response = await fetch('/app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      function: function_type
    }),
  });

  if (!response.ok) {
    throw new Error('网络错误，请稍后再试');
  }

  const data = await response.json();
  return data.response || '抱歉，我没有理解您的问题。';
}