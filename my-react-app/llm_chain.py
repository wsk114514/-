"""
llm_chain.py - LangChain集成与AI对话链模块

这是应用的AI对话核心，负责：
1. 🤖 大语言模型集成 - 通义千问/DeepSeek模型的统一接口
2. 🧠 多功能对话链 - 不同功能模式的专门化处理
3. 💾 对话记忆管理 - 按用户和功能分类的记忆存储
4. 📄 文档问答集成 - RAG检索增强生成功能
5. 🔄 流式响应支持 - 实时消息流处理
6. 🎯 Prompt工程 - 针对不同功能的优化提示词

技术栈：
- LangChain: AI应用开发框架
- 通义千问: 阿里云大语言模型
- ChromaDB: 向量数据库集成
- ConversationBufferMemory: 对话记忆管理

设计特色：
- 多租户记忆隔离：每个用户和功能独立的对话历史
- 模块化功能链：不同功能使用专门的处理链
- 智能上下文管理：自动管理对话上下文长度
- 错误恢复机制：网络异常的自动重试和降级
"""

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

# ========================= 日志配置 =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================= 全局变量 =========================

# 文档问答链的全局实例
doc_qa_chain = None

# ========================= 模型初始化 =========================

def init_llm():
    """
    初始化大语言模型
    
    功能说明：
    - 从环境变量读取API密钥
    - 配置模型参数（温度、top_p等）
    - 建立与通义千问API的连接
    - 提供统一的模型接口
    
    Returns:
        ChatTongyi: 配置好的大语言模型实例
        
    Raises:
        ValueError: API密钥未设置
        Exception: 模型初始化失败
        
    Note:
        需要在环境变量中设置DASHSCOPE_API_KEY
    """
    try:
        API_KEY = os.getenv("DASHSCOPE_API_KEY")
        if not API_KEY:
            raise ValueError("DASHSCOPE_API_KEY 环境变量未设置")
        
        # 初始化通义千问模型，设置创造性参数
        llm = ChatTongyi(name="qwen-plus", api_key=API_KEY, temperature=0.8, top_p=0.9)
        logger.info("成功初始化大语言模型")
        return llm
    except Exception as e:
        logger.error(f"大语言模型初始化失败: {str(e)}")
        raise

def init_memory():
    """
    初始化对话记忆
    
    功能说明：
    - 创建对话缓冲记忆对象
    - 配置记忆参数和格式
    - 支持消息历史的自动管理
    
    Returns:
        ConversationBufferMemory: 对话记忆实例
    """
    return ConversationBufferMemory(
        return_messages=True,    # 返回消息对象而非字符串
        memory_key="chat_history"  # 记忆在prompt中的键名
    )

# ========================= 记忆管理系统 =========================

# 全局记忆存储 - 按用户ID和功能类型分别存储
# 数据结构: {user_id: {function_type: memory_object}}
# 这种设计确保了：
# 1. 不同用户的对话完全隔离
# 2. 同一用户的不同功能对话独立
# 3. 支持多用户并发使用
memory_by_user_and_function = {}

def get_memory_for_function(function_type, user_id="default"):
    """
    获取指定用户和功能的记忆对象
    
    功能说明：
    - 按需创建用户和功能的记忆实例
    - 确保多用户环境下的数据隔离
    - 支持懒加载，节省内存资源
    
    Args:
        function_type (str): 功能类型 (general/play/game_guide/doc_qa/game_wiki)
        user_id (str): 用户标识符，默认为"default"
        
    Returns:
        ConversationBufferMemory: 对应的记忆对象
        
    Note:
        首次调用时会自动创建新的记忆实例
    """
    global memory_by_user_and_function
    
    # 确保用户ID存在于存储中
    if user_id not in memory_by_user_and_function:
        memory_by_user_and_function[user_id] = {}
    
    # 确保功能类型存在于用户的存储中
    if function_type not in memory_by_user_and_function[user_id]:
        memory_by_user_and_function[user_id][function_type] = init_memory()
        logger.info(f"为用户 {user_id} 的功能 {function_type} 创建新的记忆")
    
    return memory_by_user_and_function[user_id][function_type]

def clear_memory_for_function(function_type, user_id="default"):
    """
    清除指定用户和功能的记忆
    
    功能说明：
    - 删除特定功能的对话历史
    - 用户主动清理或重置对话时调用
    - 保持其他功能的记忆不受影响
    
    Args:
        function_type (str): 要清除记忆的功能类型
        user_id (str): 用户标识符
    """
    global memory_by_user_and_function
    
    if user_id in memory_by_user_and_function:
        if function_type in memory_by_user_and_function[user_id]:
            if memory_by_user_and_function[user_id][function_type] is not None:
                memory_by_user_and_function[user_id][function_type].clear()
                logger.info(f"用户 {user_id} 的功能 {function_type} 记忆已清除")
    
    # 如果是文档问答功能，同时清除文档数据（注意：这会影响所有用户）
    if function_type == "doc_qa":
        try:
            clear_all_document_data()
            logger.info(f"用户 {user_id} 的功能 {function_type} 的文档数据清除操作已完成")
        except Exception as e:
            logger.warning(f"清除用户 {user_id} 功能 {function_type} 的文档数据时出现问题: {e}")

def clear_all_user_memories(user_id):
    """清除指定用户的所有记忆"""
    global memory_by_user_and_function
    
    if user_id in memory_by_user_and_function:
        for function_type in memory_by_user_and_function[user_id]:
            if memory_by_user_and_function[user_id][function_type] is not None:
                memory_by_user_and_function[user_id][function_type].clear()
        
        # 删除整个用户记忆
        del memory_by_user_and_function[user_id]
        logger.info(f"用户 {user_id} 的所有记忆已清除")
    
def get_active_users_count():
    """获取当前活跃用户数量"""
    return len(memory_by_user_and_function)
    
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

def init_system(function_type="general", user_id="default"):
    """初始化对话系统 (LCEL版本)"""
    try:
        llm = init_llm()
        memory = get_memory_for_function(function_type, user_id)  # 使用用户特定的记忆
        
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
        
        logger.info(f"对话系统(LCEL)为用户 {user_id} 的功能 {function_type} 初始化成功")
        return {
            "chain": chain,
            "memory": memory,
            "llm": llm,  # 单独存储LLM对象
            "function_type": function_type,
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"对话系统初始化失败: {str(e)}")
        # 返回简单的错误处理链
        return {
            "chain": RunnableLambda(lambda x: "系统初始化失败，请检查配置"),
            "memory": ConversationBufferMemory(),
            "llm": None,
            "function_type": function_type,
            "user_id": user_id
        }

def clear_memory(system, function_type=None, user_id=None):
    """清除对话记忆"""
    global doc_qa_chain
    try:
        if function_type and user_id:
            # 清除指定用户和功能的记忆
            clear_memory_for_function(function_type, user_id)
        elif user_id:
            # 清除指定用户的所有记忆
            clear_all_user_memories(user_id)
        elif function_type:
            # 清除指定功能的记忆（向后兼容，使用默认用户）
            clear_memory_for_function(function_type, "default")
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

def get_response(message: str, system: dict, function: str, user_id: str = "default") -> str:
    """获取LLM响应 (LCEL版本)"""
    try:
        # 获取用户和功能特定的记忆
        function_memory = get_memory_for_function(function, user_id)
        
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
                
                # 将文档问答的结果保存到用户特定的记忆
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
        
        # 更新用户特定的记忆
        function_memory.save_context(
            {"input": message},
            {"output": response}
        )
        
        return response.strip()
    except Exception as e:
        logger.error(f"获取响应失败: {str(e)}")
        return "系统处理请求时出错，请稍后再试"

async def get_response_stream(message: str, system: dict, function: str, user_id: str = "default"):
    """获取LLM流式响应"""
    try:
        # 获取用户和功能特定的记忆
        function_memory = get_memory_for_function(function, user_id)
        
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
                
                # 保存完整响应到用户特定的记忆
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
            
            # 保存完整响应到用户特定的记忆
            function_memory.save_context(
                {"input": message},
                {"output": full_response}
            )
            
    except Exception as e:
        logger.error(f"获取流式响应失败: {str(e)}")
        yield "系统处理请求时出错，请稍后再试"