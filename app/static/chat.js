// chat.js 用户输入功能实现
// 让用户输入内容后点击“发送”按钮或回车，消息显示在聊天区域

// 获取相关 DOM 元素
const chatInput = document.querySelector('.chat-input');
const chatArea = document.querySelector('.chat-area');
const sendBtns = document.querySelectorAll('.send-btn');

// 发送消息函数：将用户输入内容添加到聊天区域
async function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // 创建用户气泡
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = message;
        chatArea.appendChild(userBubble);
        // 创建AI气泡
        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-bubble ai';
        aiBubble.textContent = '正在思考...'; // 初始状态
        chatArea.appendChild(aiBubble);
        chatInput.value = ''; // 清空输入框
        chatArea.scrollTop = chatArea.scrollHeight; // 滚动到底部
        const aiReply=await getResponse(message); // 调用后端获取AI回复
        aiBubble.textContent = aiReply; // 更新AI气泡内容
        // 滚动到底部
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

async function getResponse(message) {
    //调用后端 /chat 接口
    const response = await fetch('/app', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });
    if (!response.ok) {
        throw new Error('网络错误，请稍后再试');
    }
    const data = await response.json();
    return data.response || '抱歉，我没有理解您的问题。';
}


// 给“发送”按钮绑定点击事件
sendBtns.forEach(btn => {
    if (btn.textContent === '发送') {
        btn.addEventListener('click', sendMessage);
    }
});

// 支持回车键发送
chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

/*
注释说明：
- sendMessage()：负责将输入框内容作为用户气泡添加到聊天区域，并清空输入框。
- 发送按钮和输入框回车事件都能触发消息发送。
- 自动滚动聊天区域到底部，保证新消息可见。
*/
