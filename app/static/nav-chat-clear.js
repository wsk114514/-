// nav-chat-clear.js
// 功能：点击左侧导航区任意按钮后，清空聊天区，显示对应文字的AI气泡

const menuItems = document.querySelectorAll('.menu-item');
const chatArea = document.querySelector('.chat-area');

menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        // 清空聊天区
        chatArea.innerHTML = '';
        // 创建AI气泡（显示按钮文字）
        const aiBubble1 = document.createElement('div');
        aiBubble1.className = 'chat-bubble ai';
        aiBubble1.textContent = item.innerText.replace(/\s+/g, ' ');
        chatArea.appendChild(aiBubble1);
        // 再追加一个AI气泡
        const aiBubble2 = document.createElement('div');
        aiBubble2.className = 'chat-bubble ai';
        aiBubble2.textContent = '请输入您的问题与要求🎮';
        chatArea.appendChild(aiBubble2);
        chatArea.scrollTop = chatArea.scrollHeight;
    });
});

/*
注释说明：
- 点击导航区按钮后，聊天区只显示对应按钮文字的AI气泡。
- 不影响其他功能文件。
*/
