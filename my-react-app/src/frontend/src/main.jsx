/**
 * main.jsx - React应用入口文件
 * 
 * 负责React应用的启动、DOM挂载和全局配置
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FunctionProvider } from './context/FunctionContext';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FunctionProvider>
      <App />
    </FunctionProvider>
  </StrictMode>,
);
