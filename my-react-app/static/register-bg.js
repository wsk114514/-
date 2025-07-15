// register-bg.js
// 页面加载时随机选择一张背景图片
window.addEventListener("DOMContentLoaded", function () {
  const bgCount = 6;
  const idx = Math.floor(Math.random() * bgCount) + 1;
  const imgUrl = `/static/background${idx}.png`;
  document.documentElement.style.background = `url('${imgUrl}') no-repeat center center fixed`;
  document.documentElement.style.backgroundSize = "cover";
  document.body.style.background = `url('${imgUrl}') no-repeat center center fixed`;
  document.body.style.backgroundSize = "cover";
});
