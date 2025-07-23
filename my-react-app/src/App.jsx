/**
 * App.jsx - 应用程序根组件
 * 
 * 这是React应用的入口组件，负责：
 * 1. 🏗️ 应用架构搭建 - 组织整个应用的组件层次结构
 * 2. 🔄 状态管理集成 - 整合多个Context Provider
 * 3. 🧭 路由配置管理 - 定义所有页面路由和导航逻辑
 * 4. 🛡️ 权限控制集成 - 保护需要认证的页面
 * 5. 🎨 全局样式应用 - 加载主题和样式文件
 * 6. ⚠️ 错误边界保护 - 全局错误捕获和处理
 * 
 * 架构特点：
 * - 洋葱式Provider结构：从外到内依次包装Context
 * - 声明式路由：使用React Router v6的组件式路由
 * - 权限保护：通过ProtectedRoute组件保护私有页面
 * - 错误恢复：ErrorBoundary确保应用的健壮性
 * 
 * 路由设计：
 * - 公共路由：/, /login, /register
 * - 保护路由：/welcome, /chat, /:functionType
 * - 动态路由：/:functionType 支持功能类型直接访问
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FunctionProvider } from './context/FunctionContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Welcome from './pages/Welcome';
import PublicWelcome from './pages/PublicWelcome';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';
import './assets/styles/main.css';

/**
 * App 主应用组件
 * 
 * 组件层次结构（从外到内）：
 * 1. ErrorBoundary - 全局错误捕获
 * 2. ThemeProvider - 主题状态管理
 * 3. Router - 路由管理
 * 4. AuthProvider - 用户认证状态
 * 5. FunctionProvider - 功能状态管理
 * 6. Routes - 路由配置
 * 
 * @returns {JSX.Element} 应用根组件
 */
function App() {
  return (
    // 🛡️ 错误边界：捕获并处理整个应用的JavaScript错误
    <ErrorBoundary>
      {/* 🎨 主题提供者：管理深色/浅色主题状态 */}
      <ThemeProvider>
        {/* 🧭 路由器：管理客户端路由和导航 */}
        <Router>
          {/* 🔐 认证提供者：管理用户登录状态和权限 */}
          <AuthProvider>
            {/* ⚙️ 功能提供者：管理多模式对话和消息状态 */}
            <FunctionProvider>
              {/* 📍 路由配置：定义所有页面路径和组件映射 */}
              <Routes>
                {/* ========================= 公共路由 ========================= */}
                
                {/* 登录页面 - 用户身份验证入口 */}
                <Route path="/login" element={<Login />} />
                
                {/* 注册页面 - 新用户账户创建 */}
                <Route path="/register" element={<Register />} />
                
                {/* 公共欢迎页 - 应用介绍和导航 */}
                <Route path="/" element={<PublicWelcome />} />
                
                {/* ========================= 保护路由 ========================= */}
                
                {/* 用户欢迎页 - 登录后的个人化欢迎界面 */}
                <Route 
                  path="/welcome" 
                  element={
                    <ProtectedRoute>
                      <Welcome />
                    </ProtectedRoute>
                  } 
                />
                
                {/* 通用聊天页 - 默认对话界面 */}
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                
                {/* 功能特定聊天页 - 支持直接访问特定功能
                    路径示例：/play, /game_guide, /doc_qa, /game_wiki, /general */}
                <Route 
                  path="/:functionType" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </FunctionProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;