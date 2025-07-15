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
