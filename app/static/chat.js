// chat.js 聊天输入与消息处理模块
// 让用户输入内容后点击“发送”按钮或回车，消息显示在聊天区域

// 获取相关 DOM 元素
const chatInput = document.querySelector(".chat-input"); // 输入框
const chatArea = document.querySelector(".chat-area"); // 聊天显示区
const sendBtns = document.querySelectorAll(".send-btn"); // 所有发送按钮

/**
 * 发送消息函数：将用户输入内容添加到聊天区域，并请求 AI 回复
 */
async function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    // 获取当前的功能类型
    const functionType = window.currentFunctionType || "general";
    
    // 创建用户气泡并显示
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.textContent = message;
    chatArea.appendChild(userBubble);

    // 创建 AI 气泡，初始为"正在思考..."
    const aiBubble = document.createElement("div");
    aiBubble.className = "chat-bubble ai";
    aiBubble.textContent = "正在思考...";
    chatArea.appendChild(aiBubble);

    chatInput.value = ""; // 清空输入框
    chatArea.scrollTop = chatArea.scrollHeight; // 滚动到底部

    try {
      // 调用后端获取 AI 回复
      const aiReply = await getResponse(message, functionType);
      aiBubble.textContent = aiReply; // 更新 AI 气泡内容
    } catch (error) {
      console.error("发送消息失败:", error);
      aiBubble.textContent = "抱歉，我遇到了一些问题，请稍后再试。";
    }
    
    chatArea.scrollTop = chatArea.scrollHeight; // 滚动到底部
  }
}

/**
 * 调用后端 /app 接口获取 AI 回复
 */
async function getResponse(message, function_type) {
  const response = await fetch("/app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      message: message,
      function: function_type 
    }),
  });
  
  if (!response.ok) {
    throw new Error("网络错误，请稍后再试");
  }
  
  const data = await response.json();
  return data.response || "抱歉，我没有理解您的问题。";
}

// 给"发送"按钮绑定点击事件，只对"发送"按钮有效
sendBtns.forEach((btn) => {
  if (btn.textContent === "发送") {
    btn.addEventListener("click", sendMessage);
  }
});

// 支持回车键发送消息
chatInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/*
注释说明：
- sendMessage()：负责将输入框内容作为用户气泡添加到聊天区域，并清空输入框。
- 发送按钮和输入框回车事件都能触发消息发送。
- 自动滚动聊天区域到底部，保证新消息可见。
*/
