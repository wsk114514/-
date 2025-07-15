// nav-chat-clear.js 导航区点击清空聊天区模块

import { currentFunctionType } from './shared.js';

const menuItems = document.querySelectorAll(".menu-item"); // 所有导航菜单项
const chatArea = document.querySelector(".chat-area"); // 聊天显示区
const chatInput = document.querySelector(".chat-input"); // 输入框

// 为每个导航菜单项绑定点击事件
menuItems.forEach((item) => {
  item.addEventListener("click", async function (e) {
    e.preventDefault();
    
    // 获取当前点击的功能类型
    const buttonText = item.innerText.replace(/\s+/g, " ").trim();
    const functionType=item.getAttribute('data-function');

    const url=item.getAttribute('data-url');
    if (url) {
      const newurl= `${url}?function=${functionType}`;
      window.location.href = newurl  ; // 如果有链接，跳转到对应页面
    }
    // 清空聊天区内容
    chatArea.innerHTML = "";
    
    // 创建第一个AI气泡，显示按钮文字
    const aiBubble1 = document.createElement("div");
    aiBubble1.className = "chat-bubble ai";
    aiBubble1.textContent = buttonText;
    chatArea.appendChild(aiBubble1);
    
    // 发送一个初始消息来获取新功能的欢迎语
    try {
        const aiReply = await getResponse("你好！", currentFunctionType);
        const aiBubble2 = document.createElement("div");
        aiBubble2.className = "chat-bubble ai";
        aiBubble2.textContent = aiReply;
        chatArea.appendChild(aiBubble2);
    } catch (error) {
        console.error("Error:", error);
    }
    
    chatArea.scrollTop = chatArea.scrollHeight; // 滚动到底部
  });
});

/*
注释说明：
- 点击导航区按钮后，聊天区只显示对应按钮文字的AI气泡。
- 不影响其他功能文件。
*/
