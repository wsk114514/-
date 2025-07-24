# 智能对话系统 - AI Chat Application

这是一个基于 React + FastAPI 的智能对话系统，支持多功能AI对话、文档问答、用户认证和聊天记录管理。

## 🚀 核心功能

### 用户认证系统
- ✅ 用户注册/登录功能
- ✅ SQLite 数据库持久化存储
- ✅ PBKDF2 密码加密
- ✅ 会话管理和自动登录

### 聊天记录管理
- ✅ **用户独立聊天记录** - 每个用户拥有独立的聊天历史
- ✅ 多功能模式支持（通用对话、游戏推荐、文档问答等）
- ✅ 聊天记录搜索和筛选
- ✅ 自动标题生成
- ✅ 导出/导入功能
- ✅ 游客模式支持

### AI 对话功能
- 🤖 通义千问大模型集成
- 💬 多种对话模式（通用、游戏、文档问答）
- 📄 PDF/Word 文档上传问答
- 🎮 游戏推荐和攻略查询

## 🏗️ 技术栈

### 前端 (React + Vite)
- **React 19** - 现代化前端框架
- **Vite** - 快速构建工具
- **CSS3** - 响应式设计和动画效果
- **LocalStorage** - 用户独立数据存储

### 后端 (FastAPI + Python)
- **FastAPI** - 现代化API框架
- **SQLite** - 轻量级数据库
- **LangChain** - AI应用开发框架
- **ChromaDB** - 向量数据库（文档问答）

## 📁 项目结构

```
src/
├── components/           # React 组件
│   ├── ChatHistory.jsx  # 聊天记录组件（支持用户隔离）
│   └── Sidebar.jsx      # 侧边栏导航
├── context/             # React Context
│   └── AuthContext.jsx  # 用户认证状态管理
├── utils/               # 工具函数
│   ├── chatHistory.js   # 聊天记录管理器（用户独立）
│   └── userSession.js   # 用户会话管理
├── services/            # API 服务
│   └── api.js          # 后端接口封装
└── pages/              # 页面组件
    ├── Login.jsx       # 登录页面
    └── Chat.jsx        # 聊天页面
```

## 🔧 安装和运行

### 前端启动
```bash
npm install
npm run dev
```

### 后端启动
```bash
pip install -r requirements.txt
python main.py
```

## 💾 用户聊天记录隔离功能

### 设计原理
- 每个用户的聊天记录使用独立的 localStorage 键进行存储
- 存储格式：`chat_histories_{username}` (登录用户) / `chat_histories_guest` (游客)
- 用户登录/退出时自动切换聊天记录管理器实例

### 使用示例
```javascript
import { getChatHistoryManager } from './utils/chatHistory';

// 获取特定用户的聊天记录管理器
const userChatManager = getChatHistoryManager('username');
const histories = userChatManager.getAllHistories();

// 保存聊天记录（会自动关联到对应用户）
saveChatHistory(messages, functionType, title, userId);
```

### 功能特性
- 🔒 **完全隔离** - 不同用户无法看到彼此的聊天记录
- 🔄 **自动切换** - 登录/退出时自动切换到对应用户的记录
- 👤 **游客支持** - 未登录用户使用独立的游客记录存储
- 📊 **数据持久化** - 所有聊天记录本地持久化保存

## 🌟 最新更新

- ✅ 实现用户独立聊天记录系统
- ✅ 用户认证与聊天记录管理集成
- ✅ 聊天记录管理器实例自动切换
- ✅ 支持游客模式独立存储

## 开发工具

### 测试功能
运行 `src/utils/test-user-chat-history.js` 中的测试函数来验证用户聊天记录隔离功能。

---

*为每个用户提供独立、安全的聊天体验* 🎯
