# API 接口文档

## 📡 接口概览

智能游戏对话系统提供 RESTful API 接口，支持用户认证、智能对话、文档处理等核心功能。所有接口基于 HTTP 协议，使用 JSON 格式进行数据交换。

**基础 URL**: `http://localhost:8000`

**API 文档**: `http://localhost:8000/docs` (Swagger UI)

## 🔐 认证系统

### 用户注册

**接口**: `POST /register`

**描述**: 创建新用户账户

**请求体**:
```json
{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```

**响应**:
```json
// 成功 (200)
{
  "success": true,
  "message": "用户注册成功",
  "user_id": "integer"
}

// 失败 (400)
{
  "success": false,
  "message": "用户名已存在"
}
```

**示例**:
```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 用户登录

**接口**: `POST /login`

**描述**: 用户身份验证

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
// 成功 (200)
{
  "success": true,
  "message": "登录成功",
  "token": "string",
  "user_id": "integer",
  "username": "string"
}

// 失败 (401)
{
  "success": false,
  "message": "用户名或密码错误"
}
```

## 🤖 对话系统

### 发送消息

**接口**: `POST /app/chat`

**描述**: 发送消息给 AI 助手，支持多种对话模式

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "message": "string",
  "function": "general|play|game_guide|doc_qa|game_wiki",
  "stream": "boolean",
  "chat_history": [
    {
      "role": "user|assistant",
      "content": "string"
    }
  ]
}
```

**功能类型说明**:
- `general`: 通用助手
- `play`: 游戏推荐  
- `game_guide`: 游戏攻略
- `doc_qa`: 文档问答
- `game_wiki`: 游戏百科

**响应**:

非流式 (`stream: false`):
```json
{
  "response": "string",
  "function": "string"
}
```

流式 (`stream: true`):
```
Content-Type: text/event-stream

data: 你好
data: ，我是
data: 睿玩智库
data: [DONE]
```

**示例**:
```bash
# 非流式请求
curl -X POST "http://localhost:8000/app/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "推荐一些RPG游戏",
    "function": "play",
    "stream": false,
    "chat_history": []
  }'

# 流式请求
curl -X POST "http://localhost:8000/app/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "推荐一些RPG游戏", 
    "function": "play",
    "stream": true,
    "chat_history": []
  }'
```

### 清除对话记忆

**接口**: `POST /memory/clear`

**描述**: 清除指定功能的对话历史

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "function": "general|play|game_guide|doc_qa|game_wiki"
}
```

**响应**:
```json
{
  "success": true,
  "message": "记忆清除成功"
}
```

## 📄 文档处理

### 上传文档

**接口**: `POST /upload`

**描述**: 上传文档文件用于问答分析

**请求头**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**:
```
file: <二进制文件>
```

**支持格式**: PDF, DOCX, TXT
**文件大小限制**: 10MB

**响应**:
```json
// 成功 (200)
{
  "success": true,
  "message": "文件上传并处理成功",
  "filename": "string",
  "file_size": "integer",
  "chunks_created": "integer"
}

// 失败 (400)
{
  "success": false,
  "message": "不支持的文件格式"
}
```

**示例**:
```bash
curl -X POST "http://localhost:8000/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

### 清除文档数据

**接口**: `DELETE /app/documents`

**描述**: 清除所有上传的文档和向量数据

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "文档数据清除成功"
}
```

## 📊 系统信息

### 系统状态

**接口**: `GET /`

**描述**: 获取系统运行状态

**响应**:
```json
{
  "message": "智能对话系统 API 服务正在运行"
}
```

### API 文档

**接口**: `GET /docs`

**描述**: 访问 Swagger UI 交互式 API 文档

**响应**: HTML 页面

## 🔍 错误码说明

| HTTP 状态码 | 错误类型 | 描述 |
|------------|---------|------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求错误 | 请求参数错误或格式不正确 |
| 401 | 未授权 | 用户未登录或 Token 无效 |
| 403 | 禁止访问 | 用户权限不足 |
| 404 | 资源不存在 | 请求的资源未找到 |
| 413 | 文件过大 | 上传文件超过大小限制 |
| 415 | 媒体类型不支持 | 上传文件格式不支持 |
| 429 | 请求过于频繁 | 超过 API 调用频率限制 |
| 500 | 服务器错误 | 服务器内部错误 |

## 📝 请求示例

### 完整对话流程

```javascript
// 1. 用户登录
const loginResponse = await fetch('/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123'
  })
});
const loginData = await loginResponse.json();
const token = loginData.token;

// 2. 上传文档
const formData = new FormData();
formData.append('file', documentFile);
const uploadResponse = await fetch('/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// 3. 发送文档问答
const chatResponse = await fetch('/app/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: '文档的主要内容是什么？',
    function: 'doc_qa',
    stream: false,
    chat_history: []
  })
});
```

### 流式对话处理

```javascript
const response = await fetch('/app/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: '推荐一些好玩的游戏',
    function: 'play',
    stream: true,
    chat_history: []
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        return;
      }
      // 处理实时数据
      console.log(data);
    }
  }
}
```

## 🔧 开发调试

### Postman 集合

可以导入以下 Postman 集合进行 API 测试：

```json
{
  "info": {
    "name": "智能游戏对话系统 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8000"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "用户注册",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/register",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
        }
      }
    }
  ]
}
```

### cURL 测试脚本

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
TOKEN=""

# 注册用户
echo "=== 用户注册 ==="
curl -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }'

# 用户登录
echo -e "\n\n=== 用户登录 ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"  
  }')

TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 发送聊天消息
echo -e "\n\n=== 发送聊天消息 ==="
curl -X POST "$BASE_URL/app/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，推荐一些RPG游戏",
    "function": "play",
    "stream": false,
    "chat_history": []
  }'
```

## 📚 SDK 示例

### Python SDK

```python
import requests
import json

class GameChatAPI:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
    
    def register(self, username, email, password):
        """用户注册"""
        response = requests.post(f"{self.base_url}/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        return response.json()
    
    def login(self, username, password):
        """用户登录"""
        response = requests.post(f"{self.base_url}/login", json={
            "username": username,
            "password": password
        })
        data = response.json()
        if data.get("success"):
            self.token = data.get("token")
        return data
    
    def chat(self, message, function="general", stream=False, chat_history=None):
        """发送聊天消息"""
        if not self.token:
            raise ValueError("请先登录")
        
        if chat_history is None:
            chat_history = []
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(f"{self.base_url}/app/chat", 
            headers=headers,
            json={
                "message": message,
                "function": function,
                "stream": stream,
                "chat_history": chat_history
            },
            stream=stream
        )
        
        if stream:
            return self._handle_stream_response(response)
        else:
            return response.json()
    
    def _handle_stream_response(self, response):
        """处理流式响应"""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        break
                    yield data

# 使用示例
api = GameChatAPI()
api.register("testuser", "test@example.com", "password123")
api.login("testuser", "password123")

response = api.chat("推荐一些RPG游戏", function="play")
print(response)
```

### JavaScript SDK

```javascript
class GameChatAPI {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async register(username, email, password) {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    return await response.json();
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
      this.token = data.token;
    }
    return data;
  }

  async chat(message, options = {}) {
    if (!this.token) {
      throw new Error('请先登录');
    }

    const {
      function: func = 'general',
      stream = false,
      chatHistory = []
    } = options;

    const response = await fetch(`${this.baseUrl}/app/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        function: func,
        stream,
        chat_history: chatHistory
      })
    });

    if (stream) {
      return this._handleStreamResponse(response);
    } else {
      return await response.json();
    }
  }

  async *_handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          yield data;
        }
      }
    }
  }
}

// 使用示例
const api = new GameChatAPI();
await api.register('testuser', 'test@example.com', 'password123');
await api.login('testuser', 'password123');

const response = await api.chat('推荐一些RPG游戏', { function: 'play' });
console.log(response);
```
