// bubble-actions.js
// 悬停气泡时显示操作按钮，并实现复制功能

// 工具栏按钮HTML
const toolbarHTML = `
  <div class="bubble-toolbar" style="display:none; position:absolute; bottom:-48px; left:50%; transform:translateX(-50%); z-index:10;">
    <button class="bubble-btn copy">复制</button>
    <button class="bubble-btn regen">重新生成</button>
    <button class="bubble-btn like">👍</button>
    <button class="bubble-btn dislike">👎</button>
  </div>
`;

// 给所有气泡绑定悬停事件
function addBubbleToolbar() {
  const chatArea = document.querySelector(".chat-area");
  if (!chatArea) return;

  // 只为AI气泡添加工具栏
  chatArea.querySelectorAll(".chat-bubble.ai").forEach((bubble) => {
    if (!bubble.querySelector(".bubble-toolbar")) {
      bubble.style.position = "relative";
      bubble.insertAdjacentHTML("beforeend", toolbarHTML);
      bubble.querySelector(".bubble-toolbar").style.display = "flex";
    }
  });

  // 监听新气泡的添加（仅AI气泡）
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node.classList &&
          node.classList.contains("chat-bubble") &&
          node.classList.contains("ai")
        ) {
          if (!node.querySelector(".bubble-toolbar")) {
            node.style.position = "relative";
            node.insertAdjacentHTML("beforeend", toolbarHTML);
            node.querySelector(".bubble-toolbar").style.display = "flex";
          }
        }
      });
    });
  });
  observer.observe(chatArea, { childList: true });

  // 事件委托：复制按钮功能
  chatArea.addEventListener("click", function (e) {
    if (e.target.classList.contains("copy")) {
      const bubble = e.target.closest(".chat-bubble");
      if (bubble) {
        // 复制气泡文本
        const text = bubble.childNodes[0].nodeValue || bubble.textContent;
        navigator.clipboard.writeText(text.trim()).then(() => {
          e.target.textContent = "已复制";
          setTimeout(() => {
            e.target.textContent = "复制";
          }, 1200);
        });
      }
    }
    // 其他按钮可在此扩展
  });
}

window.addEventListener("DOMContentLoaded", addBubbleToolbar);
// 页面加载后自动绑定
window.addEventListener("DOMContentLoaded", addBubbleToolbar);
