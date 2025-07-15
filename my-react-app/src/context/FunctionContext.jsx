import { createContext, useState, useContext } from 'react';

const FunctionContext = createContext();

export const FunctionProvider = ({ children }) => {
  const [currentFunctionType, setCurrentFunctionType] = useState('general');
  const [messages, setMessages] = useState([]);

  return (
    <FunctionContext.Provider value={{
      currentFunctionType,
      setCurrentFunctionType,
      messages,
      setMessages
    }}>
      {children}
    </FunctionContext.Provider>
  );
};

export const useFunctionContext = () => useContext(FunctionContext);