/**
 * Register.jsx - 用户注册页面
 * 
 * 负责新用户账户创建、注册表单验证和注册成功后的自动登录
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/main.css';
import '../assets/registercss.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // 随机背景图片逻辑
  useEffect(() => {
    const bgCount = 6;
    const idx = Math.floor(Math.random() * bgCount) + 1;
    const imgUrl = `/background${idx}.png`;
    
    // 设置背景图片，确保能够正确显示
    document.documentElement.style.background = `url('${imgUrl}') no-repeat center center fixed`;
    document.documentElement.style.backgroundSize = 'cover';
    document.body.style.background = `url('${imgUrl}') no-repeat center center fixed`;
    document.body.style.backgroundSize = 'cover';
    
    // 确保页面可以正常滚动
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // 清理函数，组件卸载时清除背景设置
    return () => {
      document.documentElement.style.background = '';
      document.documentElement.style.backgroundSize = '';
      document.body.style.background = '';
      document.body.style.backgroundSize = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }
      
      // 注册成功后直接登录
      login({ username });
      
      // 跳转到欢迎页面
      navigate('/welcome');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>注册账号</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名：</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码：</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">注册</button>
        </form>
        <p>已有账号？<Link to="/login">去登录</Link></p>
      </div>
    </div>
  );
};

export default Register;