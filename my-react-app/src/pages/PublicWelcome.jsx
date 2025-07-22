import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/main.css';

const PublicWelcome = () => {
    const navigate = useNavigate();

    // 设置随机背景图片，保持与登录注册页面风格一致
    useEffect(() => {
        // 设置随机背景图片
        const bgCount = 6;
        const idx = Math.floor(Math.random() * bgCount) + 1;
        const imgUrl = `/background${idx}.png`;
        
        // 设置背景图片，确保能覆盖其他页面的样式
        document.documentElement.style.background = `url('${imgUrl}') no-repeat center center fixed`;
        document.documentElement.style.backgroundSize = 'cover';
        document.body.style.background = `url('${imgUrl}') no-repeat center center fixed`;
        document.body.style.backgroundSize = 'cover';
        
        // 确保body可以滚动
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        // 清理函数，组件卸载时清除背景
        return () => {
            document.documentElement.style.background = '';
            document.documentElement.style.backgroundSize = '';
            document.body.style.background = '';
            document.body.style.backgroundSize = '';
        };
    }, []);

    const functions = [
        {
            key: 'general',
            title: '🤖 通用助手',
            description: '智能对话助手，解答各种问题',
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
        // 未登录用户点击功能卡片时，先跳转到登录页面，登录后再跳转到对应功能页面
        navigate('/login', { state: { from: { pathname: path } } });
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    const handleRegisterClick = () => {
        navigate('/register');
    };

    return (
        <div className="public-welcome-container">
            {/* 欢迎内容 */}
            <div className="public-welcome-content">
                {/* Logo 和标题 */}
                <div className="public-welcome-header">
                    <img src="/logo.png" alt="睿玩智库" className="public-welcome-logo" />
                    <h1 className="public-welcome-title">睿玩智库</h1>
                    <p className="public-welcome-subtitle">您的智能游戏伙伴</p>
                </div>

                {/* 登录提示 */}
                <div className="login-prompt">
                    <h2>请先登录以使用我们的服务</h2>
                    <p>登录后您将可以使用以下所有功能：</p>
                    <div className="auth-buttons">
                        <button 
                            className="login-btn primary"
                            onClick={handleLoginClick}
                        >
                            立即登录
                        </button>
                        <button 
                            className="register-btn secondary"
                            onClick={handleRegisterClick}
                        >
                            注册账号
                        </button>
                    </div>
                </div>

                {/* 功能预览卡片 */}
                <div className="functions-preview">
                    <h3>功能预览</h3>
                    <div className="functions-grid">
                        {functions.map((func) => (
                            <div 
                                key={func.key} 
                                className="function-card preview"
                                onClick={() => handleCardClick(func.path)}
                                style={{
                                    '--card-color': func.color
                                }}
                            >
                                <div className="function-card-content">
                                    <h3 className="function-title">{func.title}</h3>
                                    <p className="function-description">{func.description}</p>
                                </div>
                                <div className="card-overlay">
                                    <span className="login-hint">点击登录使用</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 底部说明 */}
                <div className="public-welcome-footer">
                    <p>睿玩智库致力于为游戏玩家提供最优质的AI辅助服务</p>
                </div>
            </div>
        </div>
    );
};

export default PublicWelcome;
