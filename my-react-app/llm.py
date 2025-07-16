from langchain_ollama import OllamaLLM
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatTongyi
import os

#初始化llm
def init_llm():
    API_KEY=os.getenv("DASHSCOPE_API_KEY")
    llm=ChatTongyi(
        name="qwen-plus",
        api_key=API_KEY
    )
    return llm

#初始化记忆
def init_memory():
    memory=ConversationBufferMemory()
    return memory

#初始化系统
def init_system():
    llm=init_llm()
    memory=init_memory()
    # 定义自定义提示词模板
    template = """你是一个友好的AI助手，名字叫做睿玩智库。请用简洁的中文回答用户的问题。

当前对话历史：
{history}

人类: {input}
AI助手:"""
    
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

#获得回复
def get_response(message:str,chain:ConversationChain,function:str)->str:
    # 清除之前的对话历史
    chain.memory.clear()
    
    # 根据功能选择不同的角色描述
    if function=="play":
        role_description = "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。"
    elif function == "game_guide":
        role_description = "你是睿玩智库的游戏攻略助手形态，精确，严谨地回答用户关于游戏的各种问题，如果不清楚，请说不知道。"
    elif function == "doc_qa":
        role_description = "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，如果不清楚，请说不知道。"
    elif function == "game_wiki":
        role_description = "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识，如果不清楚，请说不知道。"
    else:
        role_description = "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
    
    # 修改模板结构
    template = f"""你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
{role_description}

当前对话历史：
{{history}}

人类: {{input}}
AI助手:"""
    
    # 更新chain的prompt模板
    chain.prompt.template = template
    
    response = chain.invoke({"input": message})
    raw_response = response["response"]
    
    if "<think>" in raw_response:
        parts = raw_response.split("</think>")
        return parts[-1].strip()
    
    return raw_response.strip()  
    