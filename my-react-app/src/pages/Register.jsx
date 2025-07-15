import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/registercss.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 随机背景图片逻辑
  useEffect(() => {
    const bgCount = 6;
    const idx = Math.floor(Math.random() * bgCount) + 1;
    const imgUrl = `/background${idx}.png`;
    document.documentElement.style.background = `url('${imgUrl}') no-repeat center center fixed`;
    document.documentElement.style.backgroundSize = 'cover';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await response.json(); // 添加这行解析错误信息
      if (!response.ok) throw new Error(data.error || '注册失败');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-container">
      <h2>注册账号</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          用户名：
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          密码：
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">注册</button>
      </form>
      <p>已有账号？<Link to="/">去登录</Link></p>
    </div>
  );
};

export default Register;