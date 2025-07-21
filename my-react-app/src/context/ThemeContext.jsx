import React, { createContext, useState, useEffect, useContext } from 'react';

// 创建主题上下文
const ThemeContext = createContext();

// 主题提供者组件
export const ThemeProvider = ({ children }) => {
  // 初始化主题状态，优先从localStorage读取，否则默认为暗色主题
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  // 当主题变化时，更新localStorage和文档类名
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  // 切换主题的方法
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义Hook，方便组件使用主题上下文
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};