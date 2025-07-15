import { useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatBubble from './components/ChatBubble';
import InputBar from './components/InputBar';
import { useFunctionContext } from './context/FunctionContext';
import './assets/styles/main.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
      </Routes>
    </Router>
  );
}

export default App;
