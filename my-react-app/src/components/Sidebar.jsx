import React, { useCallback, useMemo } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearMemory } from '../services/api';

const Sidebar = () => {
    const navigate = useNavigate();
    const { setCurrentFunctionType, clearMessages, VALID_FUNCTION_TYPES } = useFunctionContext();
    const { user, logout } = useAuth();

    // 安全的清除记忆函数
    const safeClearMemory = useCallback(async () => {
        try {
            console.log('🔄 正在尝试清除后端记忆...');
            const result = await clearMemory();
            console.log('✅ 记忆已清除:', result);
            return true;
        } catch (error) {
            console.error('⚠️ 清除记忆失败:', {
                message: error.message,
                status: error.status,
                name: error.name
            });
            return false;
        }
    }, []);

    // 菜单项配置
    const menuItems = useMemo(() => [
        {
            key: 'play',
            href: '/play',
            label: '今天玩点什么好？',
            icon: '🎮'
        },
        {
            key: 'game_guide',
            href: '/game_guide',
            label: '攻略询问',
            icon: '📖'
        },
        {
            key: 'doc_qa',
            href: '/doc_qa',
            label: '文档检索问答',
            icon: '📄'
        },
        {
            key: 'game_wiki',
            href: '/game_wiki',
            label: '游戏百科',
            icon: '📚'
        }
    ], []);

    // 处理菜单项点击
    const handleMenuItemClick = useCallback(async (functionType, e) => {
        e.preventDefault();
        
        // 验证功能类型
        if (!VALID_FUNCTION_TYPES.includes(functionType)) {
            console.error(`❌ Invalid function type: ${functionType}`);
            return;
        }

        try {
            console.log(`🔄 切换到功能: ${functionType}`);
            
            // 尝试清除后端记忆（不阻塞切换流程）
            await safeClearMemory();
            
            // 清除前端消息（总是执行）
            clearMessages();
            
            // 设置新的功能类型并导航
            setCurrentFunctionType(functionType);
            navigate(`/${functionType}`);
            
            console.log(`✅ 成功切换到功能: ${functionType}`);
        } catch (error) {
            console.error('❌ 切换功能失败:', error);
        }
    }, [VALID_FUNCTION_TYPES, clearMessages, setCurrentFunctionType, navigate, safeClearMemory]);

    // 处理退出登录
    const handleLogout = useCallback(() => {
        try {
            logout();
            navigate('/');
        } catch (error) {
            console.error('退出登录失败:', error);
        }
    }, [logout, navigate]);

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="logo">睿玩智库</div>
            
            {/* 用户信息 */}
            {user && (
                <div className="user-info">
                    欢迎, {user.username}
                </div>
            )}
            
            {/* 主菜单 */}
            <nav className="menu">
                {menuItems.map(item => (
                    <a 
                        key={item.key}
                        href={item.href} 
                        className="menu-item" 
                        onClick={(e) => handleMenuItemClick(item.key, e)}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        {item.label.split('\n').map((line, index) => (
                            <span key={index}>
                                {line}
                                {index < item.label.split('\n').length - 1 && <br />}
                            </span>
                        ))}
                    </a>
                ))}
            </nav>
            
            {/* 底部退出按钮 */}
            {user && (
                <div className="sidebar-footer">
                    <button 
                        className="logout-btn" 
                        onClick={handleLogout}
                    >
                        退出登录
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;