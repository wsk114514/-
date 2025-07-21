import os
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_models import ChatTongyi
from langchain_chroma import Chroma  
from document_processing import CHROMA_PATH, init_embeddings, clear_vector_store, clear_all_document_data
import logging
from operator import itemgetter

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

doc_qa_chain = None

def init_llm():
    """初始化大语言模型"""
    try:
        API_KEY = os.getenv("DASHSCOPE_API_KEY")
        if not API_KEY:
            raise ValueError("DASHSCOPE_API_KEY 环境变量未设置")
        
        llm = ChatTongyi(name="qwen-plus", api_key=API_KEY)
        logger.info("成功初始化大语言模型")
        return llm
    except Exception as e:
        logger.error(f"大语言模型初始化失败: {str(e)}")
        raise

def init_memory():
    """初始化对话记忆"""
    return ConversationBufferMemory(
        return_messages=True,
        memory_key="chat_history"
    )

# 全局记忆存储 - 按功能类型分别存储
memory_by_function = {
    "general": None,
    "play": None,
    "game_guide": None,
    "doc_qa": None,
    "game_wiki": None
}

def get_memory_for_function(function_type):
    """获取指定功能的记忆对象"""
    global memory_by_function
    if memory_by_function[function_type] is None:
        memory_by_function[function_type] = init_memory()
    return memory_by_function[function_type]

def clear_memory_for_function(function_type):
    """清除指定功能的记忆"""
    global memory_by_function
    if function_type in memory_by_function:
        if memory_by_function[function_type] is not None:
            memory_by_function[function_type].clear()
            logger.info(f"功能 {function_type} 的记忆已清除")
    
    # 如果是文档问答功能，同时清除文档数据
    if function_type == "doc_qa":
        try:
            clear_all_document_data()
            logger.info(f"功能 {function_type} 的文档数据清除操作已完成")
        except Exception as e:
            logger.warning(f"清除功能 {function_type} 的文档数据时出现问题: {e}")
    
def clear_all_memories():
    """清除所有功能的记忆"""
    global memory_by_function, doc_qa_chain
    for function_type in memory_by_function:
        if memory_by_function[function_type] is not None:
            memory_by_function[function_type].clear()
    
    if doc_qa_chain and hasattr(doc_qa_chain, 'memory'):
        doc_qa_chain.memory.clear()
        logger.info("文档问答记忆已清除")
    
    # 清除所有文档数据（向量存储和上传文件）
    try:
        clear_all_document_data()
        logger.info("文档数据清除操作已完成")
    except Exception as e:
        logger.warning(f"清除文档数据时出现问题: {e}")
    
    logger.info("所有功能的记忆已清除")

class EmptyDocQAChain:
    """空文档问答链（当没有文档时使用）"""
    def __call__(self, *args, **kwargs):
        return {"answer": "不清楚文档内容，请上传文档内容后重试。"}
    
    def invoke(self, input_data, *args, **kwargs):
        return {"answer": "不清楚文档内容，请上传文档内容后重试。"}
    
    async def astream(self, input_data, *args, **kwargs):
        """异步流式处理方法"""
        message = "不清楚文档内容，请上传文档内容后重试。"
        # 逐字符返回，模拟流式输出
        for char in message:
            yield char

def format_docs(docs):
    """格式化检索到的文档"""
    return "\n\n".join(doc.page_content for doc in docs)

def init_doc_qa_system(llm):
    """初始化文档问答系统 (LCEL版本)"""
    global doc_qa_chain
    if doc_qa_chain is not None:
        return doc_qa_chain
    
    # LCEL提示词模板
    qa_template = """你是睿玩智库的文档检索助手形态，请根据提供的文档内容回答问题。如果文档内容不包含答案，请回答"根据文档内容，我无法回答这个问题"。
    
    文档内容：
    {context}
    
    当前对话历史：
    {chat_history}

    人类: {question}
    AI助手:"""
    
    QA_PROMPT = ChatPromptTemplate.from_template(qa_template)
    
    try:
        # 检查向量数据库是否存在
        if not os.path.exists(CHROMA_PATH) or not os.listdir(CHROMA_PATH):
            logger.warning("向量数据库不存在或为空，使用空文档问答链")
            doc_qa_chain = EmptyDocQAChain()
            return doc_qa_chain
        
        embeddings = init_embeddings()
        chroma_db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embeddings
        )
        retriever = chroma_db.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}
        )
        
        # LCEL链构建
        doc_qa_chain = (
            {
                "context": itemgetter("question") | retriever | RunnableLambda(format_docs),
                "chat_history": itemgetter("chat_history"),
                "question": itemgetter("question")
            }
            | QA_PROMPT
            | llm
            | StrOutputParser()
        )
        
        logger.info("文档问答系统(LCEL)初始化成功")
        return doc_qa_chain
    except Exception as e:
        logger.error(f"文档问答系统初始化失败: {str(e)}")
        doc_qa_chain = EmptyDocQAChain()
        return doc_qa_chain

def init_system(function_type="general"):
    """初始化对话系统 (LCEL版本)"""
    try:
        llm = init_llm()
        memory = get_memory_for_function(function_type)  # 使用功能特定的记忆
        
        # 动态角色描述
        role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是睿玩智库的游戏攻略助手形态，精确，严谨地回答用户关于游戏的各种问题，如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识，如果不清楚，请说不知道。"
        }

        # LCEL提示词模板
        template = """你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
        {role_description}
        
        当前对话历史：
        {chat_history}
        
        人类: {input}
        AI助手:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # LCEL链构建
        chain = (
            {
                "role_description": RunnableLambda(
                    lambda x: role_descriptions.get(
                        function_type,  # 使用传入的功能类型
                        "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
                    )
                ),
                "chat_history": RunnableLambda(lambda x: memory.load_memory_variables({})["chat_history"]),
                "input": itemgetter("input")
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        logger.info(f"对话系统(LCEL)为功能 {function_type} 初始化成功")
        return {
            "chain": chain,
            "memory": memory,
            "llm": llm,  # 单独存储LLM对象
            "function_type": function_type
        }
    except Exception as e:
        logger.error(f"对话系统初始化失败: {str(e)}")
        # 返回简单的错误处理链
        return {
            "chain": RunnableLambda(lambda x: "系统初始化失败，请检查配置"),
            "memory": ConversationBufferMemory(),
            "llm": None,
            "function_type": function_type
        }

def clear_memory(system, function_type=None):
    """清除对话记忆"""
    global doc_qa_chain
    try:
        if function_type:
            # 清除指定功能的记忆
            clear_memory_for_function(function_type)
        else:
            # 清除当前系统的记忆（向后兼容）
            system["memory"].clear()
            logger.info("当前系统对话记忆已清除")
        
        if doc_qa_chain and hasattr(doc_qa_chain, 'memory'):
            doc_qa_chain.memory.clear()
            logger.info("文档问答记忆已清除")
        
        # 如果没有指定功能类型或者是文档问答功能，清除文档数据
        if function_type is None or function_type == "doc_qa":
            try:
                clear_all_document_data()
                logger.info("文档数据清除操作已完成")
            except Exception as e:
                logger.warning(f"清除文档数据时出现问题: {e}")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")

def get_response(message: str, system: dict, function: str) -> str:
    """获取LLM响应 (LCEL版本)"""
    try:
        # 获取功能特定的记忆
        function_memory = get_memory_for_function(function)
        
        # 文档问答功能
        if function == "doc_qa":
            # 使用单独存储的LLM对象
            doc_qa_chain = init_doc_qa_system(system["llm"])
            try:
                # 获取当前对话历史
                chat_history = function_memory.load_memory_variables({})["chat_history"]
                
                result = doc_qa_chain.invoke({
                    "question": message,
                    "chat_history": chat_history
                })
                
                # 将文档问答的结果保存到功能特定的记忆
                function_memory.save_context(
                    {"input": message},
                    {"output": result}
                )
                
                return result
            except Exception as e:  
                logger.error(f"处理文档问答时出错: {str(e)}")
                return "处理文档时发生错误，请稍后再试"
        
        # 通用对话功能 - 创建一个临时的链，使用功能特定的记忆
        llm = system["llm"]
        role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是睿玩智库的游戏攻略助手形态，精确，严谨地回答用户关于游戏的各种问题，如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识，如果不清楚，请说不知道。"
        }
        
        template = """你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
        {role_description}
        
        当前对话历史：
        {chat_history}
        
        人类: {input}
        AI助手:"""
        
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.runnables import RunnableLambda
        from langchain_core.output_parsers import StrOutputParser
        from operator import itemgetter
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # 使用功能特定的记忆创建链
        chain = (
            {
                "role_description": RunnableLambda(
                    lambda x: role_descriptions.get(
                        function,
                        "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
                    )
                ),
                "chat_history": RunnableLambda(lambda x: function_memory.load_memory_variables({})["chat_history"]),
                "input": itemgetter("input")
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        response = chain.invoke({"input": message})
        
        # 更新功能特定的记忆
        function_memory.save_context(
            {"input": message},
            {"output": response}
        )
        
        return response.strip()
    except Exception as e:
        logger.error(f"获取响应失败: {str(e)}")
        return "系统处理请求时出错，请稍后再试"

async def get_response_stream(message: str, system: dict, function: str):
    """获取LLM流式响应"""
    try:
        # 获取功能特定的记忆
        function_memory = get_memory_for_function(function)
        
        # 文档问答功能
        if function == "doc_qa":
            doc_qa_chain = init_doc_qa_system(system["llm"])
            try:
                chat_history = function_memory.load_memory_variables({})["chat_history"]
                
                # 使用 astream 进行流式处理
                full_response = ""
                async for chunk in doc_qa_chain.astream({
                    "question": message,
                    "chat_history": chat_history
                }):
                    if chunk:
                        full_response += chunk
                        yield chunk
                
                # 保存完整响应到功能特定的记忆
                function_memory.save_context(
                    {"input": message},
                    {"output": full_response}
                )
                
            except Exception as e:
                logger.error(f"处理文档问答时出错: {str(e)}")
                yield "处理文档时发生错误，请稍后再试"
        else:
            # 通用对话功能 - 创建临时链使用功能特定的记忆
            llm = system["llm"]
            role_descriptions = {
                "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
                "game_guide": "你是睿玩智库的游戏攻略助手形态，精确，严谨地回答用户关于游戏的各种问题，如果不清楚，请说不知道。",
                "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
                "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识，如果不清楚，请说不知道。"
            }
            
            template = """你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
            {role_description}
            
            当前对话历史：
            {chat_history}
            
            人类: {input}
            AI助手:"""
            
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.runnables import RunnableLambda
            from langchain_core.output_parsers import StrOutputParser
            from operator import itemgetter
            
            prompt = ChatPromptTemplate.from_template(template)
            
            # 使用功能特定的记忆创建链
            chain = (
                {
                    "role_description": RunnableLambda(
                        lambda x: role_descriptions.get(
                            function,
                            "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
                        )
                    ),
                    "chat_history": RunnableLambda(lambda x: function_memory.load_memory_variables({})["chat_history"]),
                    "input": itemgetter("input")
                }
                | prompt
                | llm
                | StrOutputParser()
            )
            
            full_response = ""
            async for chunk in chain.astream({"input": message}):
                if chunk:
                    full_response += chunk
                    yield chunk
            
            # 保存完整响应到功能特定的记忆
            function_memory.save_context(
                {"input": message},
                {"output": full_response}
            )
            
    except Exception as e:
        logger.error(f"获取流式响应失败: {str(e)}")
        yield "系统处理请求时出错，请稍后再试"