/**
 * Welcome.jsx - 用户欢迎页面
 * 
 * 负责登录后的欢迎界面展示和功能导航入口
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Welcome = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // 清除登录页面设置的背景图片，使用主题背景
    useEffect(() => {
        // 清除之前可能设置的背景图片
        document.documentElement.style.background = '';
        document.documentElement.style.backgroundSize = '';
        document.body.style.background = '';
        document.body.style.backgroundSize = '';
        
        // 确保body可以滚动
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    }, []);

    // 功能卡片数据
    const functionCards = [
        {
            key: 'general',
            title: '💬 通用助手',
            description: '智能对话助手，帮您解答各种问题',
            path: '/general',
            color: '#667eea'
        },
        {
            key: 'play',
            title: '🎮 游戏推荐',
            description: '根据您的喜好推荐适合的游戏',
            path: '/play',
            color: '#f093fb'
        },
        {
            key: 'game_guide',
            title: '📖 攻略询问',
            description: '获取游戏攻略和技巧指导',
            path: '/game_guide',
            color: '#4facfe'
        },
        {
            key: 'doc_qa',
            title: '📄 文档问答',
            description: '上传文档并进行智能问答',
            path: '/doc_qa',
            color: '#43e97b'
        },
        {
            key: 'game_wiki',
            title: '📚 游戏百科',
            description: '查询游戏相关知识和信息',
            path: '/game_wiki',
            color: '#fa709a'
        }
    ];

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <div className="welcome-container">
            {/* 主题切换按钮 */}
            <button 
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`切换到${theme === 'light' ? '深色' : '浅色'}主题`}
            >
                {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* 欢迎内容 */}
            <div className="welcome-content">
                {/* Logo 和标题 */}
                <div className="welcome-header">
                    <img src="/logo.png" alt="睿玩智库" className="welcome-logo" />
                    <h1 className="welcome-title">睿玩智库</h1>
                    <p className="welcome-subtitle">您的智能游戏助手</p>
                </div>

                {/* 用户欢迎信息 */}
                {user && (
                    <div className="user-welcome">
                        <h2>欢迎回来，{user.username}！</h2>
                        <p>选择一个功能开始您的智能对话之旅</p>
                    </div>
                )}

                {/* 功能卡片网格 */}
                <div className="functions-grid">
                    {functionCards.map((card) => (
                        <div
                            key={card.key}
                            className="function-card"
                            onClick={() => handleCardClick(card.path)}
                            style={{ '--card-color': card.color }}
                        >
                            <div className="card-content">
                                <h3 className="card-title">{card.title}</h3>
                                <p className="card-description">{card.description}</p>
                            </div>
                            <div className="card-arrow">→</div>
                        </div>
                    ))}
                </div>

                {/* 底部信息 */}
                <div className="welcome-footer">
                    <p>基于先进的AI技术，为您提供智能化的游戏体验</p>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
