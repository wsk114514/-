import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/main.css';
import '../assets/logincss.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // 从状态中获取重定向路径，默认重定向到通用助手
  const from = location.state?.from?.pathname || '/general';

  // 随机背景图片逻辑
  useEffect(() => {
    const bgCount = 6;
    const idx = Math.floor(Math.random() * bgCount) + 1;
    const imgUrl = `/background${idx}.png`;
    document.documentElement.style.background = `url('${imgUrl}') no-repeat center center fixed`;
    document.documentElement.style.backgroundSize = 'cover';
    document.body.style.background = `url('${imgUrl}') no-repeat center center fixed`;
    document.body.style.backgroundSize = 'cover';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }
      
      // 登录成功后更新认证状态
      login({ username });
      
      // 重定向到之前尝试访问的页面或默认页面
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <img src="/logo.png" alt="睿玩智库LOGO" className="login-logo" />
      <div className="login-container">
        <h2>用户登录</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">登录</button>
          <p>没有账号？<Link to="/register">去注册</Link></p>
        </form>
        <div className="footer">© 2025 我的应用系统</div>
      </div>
    </div>
  );
};

export default Login;