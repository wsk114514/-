from langchain_ollama import OllamaLLM
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatTongyi
import os
def init_llm():
    API_KEY=os.getenv("DASHSCOPE_API_KEY")
    llm=ChatTongyi(
        name="qwen-plus",
        api_key=API_KEY
    )
    return llm

def init_memory():
    memory=ConversationBufferMemory()
    return memory

def init_system():
    llm=init_llm()
    memory=init_memory()
    # 定义自定义提示词模板
    template = """你是一个友好的AI助手。请用简洁的中文回答用户的问题。注意：<think>内的内容是AI的思考过程。请记住对话历史中的信息。

当前对话历史：
{history}

人类: {input}
AI助手: """
    
    prompt = PromptTemplate(
        input_variables=["history", "input"],
        template=template
    )
    
    chain=ConversationChain(
        llm=llm,
        memory=memory,
        prompt=prompt,  # 使用自定义提示词
        verbose=True,
    )
    return chain



def get_response(message:str,chain:ConversationChain)->str:
    response=chain.invoke({"input":message})
    # 获取原始响应
    raw_response = response["response"]
    
    # 如果存在 think 标记，只保留最后一部分（实际回答）
    if "<think>" in raw_response:
        # 分割并获取最后一部分（实际回答）
        parts = raw_response.split("</think>")
        return parts[-1].strip()
    
    return raw_response

    