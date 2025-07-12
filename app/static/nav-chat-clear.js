// nav-chat-clear.js 导航区点击清空聊天区模块
// 功能：点击左侧导航区任意按钮后，清空聊天区，显示对应文字的AI气泡

const menuItems = document.querySelectorAll(".menu-item"); // 所有导航菜单项
const chatArea = document.querySelector(".chat-area"); // 聊天显示区

// 为每个导航菜单项绑定点击事件
menuItems.forEach((item) => {
  item.addEventListener("click", function (e) {
    e.preventDefault();
    // 清空聊天区内容
    chatArea.innerHTML = "";
    // 创建第一个AI气泡，显示按钮文字
    const aiBubble1 = document.createElement("div");
    aiBubble1.className = "chat-bubble ai";
    aiBubble1.textContent = item.innerText.replace(/\s+/g, " ");
    chatArea.appendChild(aiBubble1);
    // 创建第二个AI气泡，提示用户输入问题
    const aiBubble2 = document.createElement("div");
    aiBubble2.className = "chat-bubble ai";
    aiBubble2.textContent = "请输入您的问题与要求🎮";
    chatArea.appendChild(aiBubble2);
    chatArea.scrollTop = chatArea.scrollHeight; // 滚动到底部
  });
});

/*
注释说明：
- 点击导航区按钮后，聊天区只显示对应按钮文字的AI气泡。
- 不影响其他功能文件。
*/
