# 🤖 智能问答与游戏推荐系统

一个基于 **FastAPI + React 19** 的现代化智能问答系统，集成了文档处理、向量检索、AI对话和游戏推荐功能。

## � 项目概述

本项目是一个功能丰富的智能问答平台，用户可以：

- 📄 上传和处理各种文档（PDF、Word、TXT等）
- 🤖 与AI进行智能对话
- 🎮 获取个性化游戏推荐
- 👤 用户注册登录和数据隔离
- 📚 管理个人聊天历史和游戏收藏

## 🎯 核心功能

### 🔐 用户系统
- **用户注册登录**: 支持用户名/密码认证
- **数据隔离**: 每个用户拥有独立的聊天历史和游戏收藏
- **会话管理**: 持久化用户登录状态
- **事件驱动**: 用户切换时自动同步数据状态

### 💬 智能问答
- **多模型支持**: 集成DeepSeek和通义千问AI模型
- **上下文记忆**: 维持对话上下文的连续性
- **文档检索**: 基于用户上传文档的问答
- **智能提示**: 根据聊天内容生成相关问题建议

### 📄 文档处理
- **多格式支持**: PDF、Word、TXT文件上传
- **向量化存储**: 使用ChromaDB进行向量检索
- **内容解析**: 智能提取和分析文档内容
- **检索增强**: RAG（检索增强生成）技术

### 🎮 游戏推荐
- **智能推荐**: 基于用户偏好的游戏推荐
- **收藏管理**: 个人游戏收藏列表
- **详细信息**: 游戏描述、评分、类型等信息
- **搜索过滤**: 按类型、平台、评分筛选

## 🏗️ 项目结构

```
my-react-app/                        # 项目主目录
├── backend/                         # 后端服务
│   ├── main.py                      # FastAPI主应用
│   ├── auth.py                      # 用户认证模块
│   ├── models.py                    # 数据模型
│   ├── database.py                  # 数据库操作
│   ├── config.py                    # 配置管理
│   ├── document_processing.py       # 文档处理
│   ├── llm_chain.py                # AI对话链
│   ├── requirements.txt             # Python依赖
│   ├── start.bat                    # 后端启动脚本
│   ├── static/                      # 静态文件
│   ├── uploads/                     # 上传文件
│   ├── chroma_db/                   # 向量数据库
│   └── user_database.db            # 用户数据库
├── frontend/                        # 前端应用
│   ├── src/                         # React源码目录
│   │   ├── components/              # React组件
│   │   │   ├── ChatBubble.jsx      # 聊天气泡组件
│   │   │   ├── ChatHistory.jsx     # 聊天历史组件
│   │   │   ├── ErrorBoundary.jsx   # 错误边界组件
│   │   │   ├── InputBar.jsx        # 输入栏组件
│   │   │   ├── ProtectedRoute.jsx  # 路由保护组件
│   │   │   └── Sidebar.jsx         # 侧边栏组件
│   │   ├── context/                 # React上下文
│   │   │   ├── AuthContext.jsx     # 认证上下文
│   │   │   ├── FunctionContext.jsx # 功能上下文
│   │   │   └── ThemeContext.jsx    # 主题上下文
│   │   ├── hooks/                   # 自定义Hook
│   │   │   └── useCommon.js        # 通用Hook
│   │   ├── pages/                   # 页面组件
│   │   │   ├── Chat.jsx            # 聊天页面
│   │   │   ├── Login.jsx           # 登录页面
│   │   │   ├── PublicWelcome.jsx   # 公共欢迎页
│   │   │   ├── Register.jsx        # 注册页面
│   │   │   └── Welcome.jsx         # 用户欢迎页
│   │   ├── services/                # 服务层
│   │   │   └── api.js              # API接口
│   │   ├── utils/                   # 工具函数
│   │   │   ├── chatHistory.js      # 聊天历史管理
│   │   │   ├── gameCollection.js   # 游戏收藏管理
│   │   │   ├── helpers.js          # 辅助函数
│   │   │   └── userSession.js      # 用户会话管理
│   │   ├── assets/                  # 静态资源
│   │   │   └── styles/             # 样式文件
│   │   ├── App.jsx                  # 根组件
│   │   └── main.jsx                # 应用入口
│   ├── public/                      # 公共资源
│   ├── index.html                   # HTML模板
│   ├── package.json                 # 依赖配置
│   ├── vite.config.js              # Vite配置
│   └── start.bat                    # 前端启动脚本
├── README.md                        # 项目说明
├── 代码详细注释文档.md              # 代码注释文档
└── 项目架构梳理文档.md              # 架构设计文档
```

## 🚀 快速开始

### 环境要求
- **Python**: 3.8+ 
- **Node.js**: 16+
- **npm**: 7+

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd my-react-app
   ```

2. **启动后端服务**
   ```bash
   cd backend
   # Windows用户可以直接运行
   start.bat
   
   # 或手动启动
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **启动前端服务**
   ```bash
   cd ../frontend
   # Windows用户可以直接运行
   start.bat
   
   # 或手动启动
   npm install
   npm run dev
   ```

4. **访问应用**
   - 前端地址: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

## 🛠️ 开发指南

### 后端开发
- **框架**: FastAPI + SQLAlchemy
- **数据库**: SQLite (用户数据) + ChromaDB (向量存储)
- **AI集成**: DeepSeek API + 通义千问
- **主要模块**:
  - `main.py`: 应用入口和路由定义
  - `auth.py`: 用户认证和授权
  - `models.py`: 数据模型定义
  - `llm_chain.py`: AI对话链管理

### 前端开发
- **框架**: React 19 + Vite
- **路由**: React Router v6
- **状态管理**: Context API
- **样式**: CSS Modules + 自定义CSS
- **主要特性**:
  - 响应式设计
  - 暗色/浅色主题切换
  - 实时聊天界面
  - 用户数据隔离

### 核心架构特点

#### 🔒 用户数据隔离系统
项目实现了完整的用户数据隔离机制：

1. **事件驱动架构**: 通过 `userSwitchEvents.js` 管理用户切换事件
2. **数据隔离**: 聊天历史和游戏收藏按用户ID独立存储
3. **自动同步**: 用户切换时自动清理和重新加载数据
4. **防数据泄露**: 确保用户只能访问自己的数据

#### 🤖 智能问答链
基于 LangChain 构建的智能问答系统：

1. **多模型支持**: 集成多个AI模型提供商
2. **文档检索**: RAG技术结合向量检索
3. **上下文记忆**: 维持对话连续性
4. **智能提示**: 基于聊天内容生成相关问题

#### 🎮 游戏推荐引擎
个性化游戏推荐系统：

1. **智能推荐**: 基于用户偏好和历史数据
2. **收藏管理**: 完整的游戏收藏CRUD操作
3. **分类过滤**: 支持多维度筛选和搜索
4. **用户隔离**: 每个用户独立的收藏列表

## 📖 API文档

### 用户认证接口
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `POST /logout` - 用户登出

### 聊天接口
- `POST /chat` - 发送聊天消息
- `GET /chat/history` - 获取聊天历史

### 文档处理接口
- `POST /upload` - 上传文档
- `GET /documents` - 获取文档列表
- `DELETE /documents/{id}` - 删除文档

### 游戏推荐接口
- `POST /games/recommend` - 获取游戏推荐
- `GET /games/collection` - 获取游戏收藏
- `POST /games/collection` - 添加游戏到收藏

## 🔧 配置说明

### 环境变量配置
在 `backend/config.py` 中配置以下环境变量：

```python
# AI模型配置
DEEPSEEK_API_KEY = "your-deepseek-api-key"
TONGYI_API_KEY = "your-tongyi-api-key"

# 数据库配置
DATABASE_URL = "sqlite:///./user_database.db"
CHROMA_DB_PATH = "./chroma_db"

# 安全配置
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

### 前端配置
在 `frontend/vite.config.js` 中配置开发服务器：

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

## 🐛 常见问题

### Q: 启动时提示端口占用？
A: 修改配置文件中的端口设置，确保前端（3000）和后端（8000）端口可用。

### Q: AI模型无法访问？
A: 检查 `config.py` 中的API密钥配置，确保密钥有效且网络连接正常。

### Q: 文档上传失败？
A: 确保 `backend/uploads/` 目录存在且有写入权限。

### Q: 用户数据没有隔离？
A: 检查用户是否正确登录，以及 `AuthContext` 是否正确传递用户信息。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系开发团队。

---

**享受智能问答和游戏推荐的乐趣！** 🎮✨
