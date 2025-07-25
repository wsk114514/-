"""
llm_chain.py - LangChain集成与AI对话链模块

这是应用的AI对话核心，负责：
1. 🤖 大语言模型集成 - 通义千问模型的统一接口
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
from document_processing import CHROMA_PATH, get_user_chroma_path, init_embeddings, clear_vector_store, clear_all_document_data, clear_user_document_data
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
    
    # 如果是文档问答功能，同时清除文档数据
    if function_type == "doc_qa":
        try:
            clear_user_document_data(user_id)
            logger.info(f"用户 {user_id} 的功能 {function_type} 的文档数据清除操作已完成")
        except Exception as e:
            logger.warning(f"清除用户 {user_id} 功能 {function_type} 的文档数据时出现问题: {e}")

def clear_all_user_memories(user_id):
    """
    清除指定用户的所有功能模块的对话记忆。

    当用户希望重置所有对话历史，或者在用户注销时，此函数非常有用。
    它会遍历该用户的所有功能记忆并清空，然后从全局记忆存储中移除该用户条目。

    Args:
        user_id (str): 需要清除所有记忆的用户ID。
    """
    global memory_by_user_and_function
    
    if user_id in memory_by_user_and_function:
        for function_type in memory_by_user_and_function[user_id]:
            if memory_by_user_and_function[user_id][function_type] is not None:
                memory_by_user_and_function[user_id][function_type].clear()
        
        # 删除整个用户记忆
        del memory_by_user_and_function[user_id]
        logger.info(f"用户 {user_id} 的所有记忆已清除")
    
def get_active_users_count():
    """
    获取当前拥有活跃记忆会话的用户数量。

    "活跃"定义为在全局记忆存储 `memory_by_user_and_function` 中存在条目的用户。
    这可以用于监控应用的并发使用情况。

    Returns:
        int: 当前活跃用户的数量。
    """
    return len(memory_by_user_and_function)
    
class EmptyDocQAChain:
    """
    一个占位符链，当用户没有上传文档或文档处理失败时使用。
    
    这个类模仿了LangChain的Runnable接口，提供了同步和异步的调用方法，
    但总是返回一个固定的、提示用户上传文档的消息。
    这样可以确保即使RAG系统未就绪，程序也能优雅地响应。
    """
    def __call__(self, *args, **kwargs):
        """使类的实例可以像函数一样被调用，兼容旧版调用方式。"""
        return self.invoke(None)
    
    def invoke(self, input_data, *args, **kwargs):
        """
        同步调用方法，返回固定的提示信息。
        
        Args:
            input_data: 输入数据（在此实现中被忽略）。
        
        Returns:
            dict: 包含固定答案的字典。
        """
        return {"answer": "不清楚文档内容，请上传文档内容后重试。"}
    
    async def astream(self, input_data, *args, **kwargs):
        """
        异步流式处理方法，逐字生成固定的提示信息。
        
        这模拟了真实LLM的流式输出行为，为前端提供了一致的体验。
        
        Args:
            input_data: 输入数据（在此实现中被忽略）。
        
        Yields:
            str: 单个字符的流式响应。
        """
        message = "不清楚文档内容，请上传文档内容后重试。"
        # 逐字符返回，模拟流式输出
        for char in message:
            yield char

def format_docs(docs):
    """
    将从向量数据库检索到的文档列表格式化为单个字符串。
    
    每个文档的内容由两个换行符分隔，这是将上下文注入提示词的常用方法。
    
    Args:
        docs (list): LangChain的Document对象列表。
        
    Returns:
        str: 拼接好的、包含所有文档内容的字符串。
    """
    return "\n\n".join(doc.page_content for doc in docs)

def init_doc_qa_system(llm, user_id: str = "default"):
    """
    为指定用户初始化文档问答（RAG）系统。

    此函数构建一个基于LCEL（LangChain Expression Language）的链，该链能够：
    1. 接收一个问题。
    2. 使用该问题从用户专属的ChromaDB向量存储中检索相关文档。
    3. 将检索到的文档格式化为上下文。
    4. 将上下文、问题和对话历史注入到一个结构化的提示词中。
    5. 将填充好的提示词发送给LLM。
    6. 解析并返回LLM的最终答案。

    如果用户的向量数据库不存在或为空，它将返回一个 `EmptyDocQAChain` 实例，
    该实例会返回一条友好的提示信息，而不是尝试执行问答。

    Args:
        llm: 已初始化的LangChain LLM实例。
        user_id (str, optional): 目标用户的ID。默认为 "default"。

    Returns:
        Runnable: 一个可执行的LCEL链，用于文档问答。
                  或者是 `EmptyDocQAChain` 的一个实例。
    """
    global doc_qa_chain
    
    # 获取用户专属的ChromaDB路径
    user_chroma_path = get_user_chroma_path(user_id)
    
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
        # 检查用户的向量数据库是否存在
        if not os.path.exists(user_chroma_path) or not os.listdir(user_chroma_path):
            logger.warning(f"用户 {user_id} - 向量数据库不存在或为空，使用空文档问答链")
            return EmptyDocQAChain()
        
        embeddings = init_embeddings()
        chroma_db = Chroma(
            persist_directory=user_chroma_path,
            embedding_function=embeddings
        )
        retriever = chroma_db.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}
        )
        
        # LCEL链构建
        user_doc_qa_chain = (
            {
                "context": itemgetter("question") | retriever | RunnableLambda(format_docs),
                "chat_history": itemgetter("chat_history"),
                "question": itemgetter("question")
            }
            | QA_PROMPT
            | llm
            | StrOutputParser()
        )
        
        logger.info(f"用户 {user_id} - 文档问答系统(LCEL)初始化成功")
        return user_doc_qa_chain
    except Exception as e:
        logger.error(f"用户 {user_id} - 文档问答系统初始化失败: {str(e)}")
        return EmptyDocQAChain()

def init_system(function_type="general", user_id="default"):
    """
    根据功能类型初始化对话系统。

    这个函数是对话系统的主要入口点。它负责：
    1. 初始化大语言模型（LLM）。
    2. 根据 `function_type` 选择相应的角色描述（prompt）。
    3. 返回一个包含LLM实例和角色描述的配置字典。

    注意：此版本的 `init_system` 不再管理记忆（`memory`），因为对话历史
    现在由前端直接通过 `chat_history` 参数在每次请求中传递。
    这使得后端变得无状态，更易于扩展和管理。

    Args:
        function_type (str, optional): 对话的功能类型。默认为 "general"。
        user_id (str, optional): 用户ID，主要用于日志记录和未来可能的扩展。默认为 "default"。

    Returns:
        dict: 一个包含 "llm", "role_descriptions", 和 "function_type" 的字典。
    
    Raises:
        Exception: 如果LLM初始化失败。
    """
    try:
        llm = init_llm()
        # 注意：不再使用记忆系统，记忆由前端chat_history传递
        
        # 动态角色描述
        role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是专业的游戏攻略助手，提供清晰、结构化的攻略步骤。\n" +
                "回答格式要求：\n" +
                "1. 问题分析：简要分析用户的问题\n" +
                "2. 所需条件：列出解决问题需要的物品、等级等条件\n" +
                "3. 步骤详解：分步骤说明解决方法，每步包含具体操作\n" +
                "4. 注意事项：提醒用户需要注意的地方\n" +
                "5. 替代方案：如果有其他解决方法，简要说明\n" +
                "请确保回答具体、可操作，避免模糊描述。如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识。\n" +
                "回答格式要求：\n" +
                "1. 游戏名称、类型、平台、开发商、发行商、发布日期等基本信息\n" +
                "2. 游戏类型：如动作游戏、策略游戏、角色扮演游戏等\n" +
                "3. 游戏平台：如PC、 consoles、移动端等\n" +
                "4.游戏发行商：如 Electronic Arts、Ubisoft、Nintendo等\n" +
                "5.发布日期：游戏的发布日期\n"
                "6. 游戏简介：简要介绍游戏的核心玩法和特色\n" +
                "7. 剧情概要：如果有主要剧情线，简要描述\n" +
                "8. 主要角色：列出主要角色及其简介\n" +
                "9. 游戏特色：列举游戏的核心特色\n" +
                "10. 相关推荐：推荐2-3款类似游戏\n" +
                "请确保信息准确，结构清晰。如果不清楚，请说不知道。"
        }

        logger.info(f"LLM系统初始化成功 - 功能类型: {function_type}")
        
        # 返回LLM实例和角色描述，不包含记忆系统
        return {
            "llm": llm,
            "role_descriptions": role_descriptions,
            "function_type": function_type
        }
        
    except Exception as e:
        logger.error(f"LLM系统初始化失败: {str(e)}")
        raise

def clear_memory(system, function_type=None, user_id=None):
    """
    清除对话记忆和相关的文档数据。

    此函数提供了多种清除模式：
    - 清除特定用户和功能的记忆。
    - 清除特定用户的所有记忆。
    - 清除特定功能在默认用户下的记忆（用于向后兼容）。
    - 清除当前系统的记忆（用于向后兼容）。

    Args:
        system (dict): 当前的系统配置，包含记忆对象。
        function_type (str, optional): 要清除记忆的功能类型。
        user_id (str, optional): 目标用户的ID。
    """
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

def get_response(message: str, system: dict, function: str, user_id: str = "default", chat_history: list = None) -> str:
    """
    获取LLM响应 (LCEL版本) - 同步非流式版本。

    此函数是处理用户请求并返回单个、完整响应的核心逻辑。
    它根据功能类型（`function`）动态地选择和执行适当的LCEL链。

    主要流程：
    1.  接收用户消息、系统配置、功能类型、用户ID和对话历史。
    2.  将前端传入的 `chat_history` (JSON列表) 格式化为LLM可读的纯文本。
    3.  如果功能是 'doc_qa'，则初始化并调用文档问答链。
    4.  对于其他功能，构建一个通用的对话链，注入相应的角色描述和格式化后的历史记录。
    5.  同步调用（`.invoke()`）选择的链并获取完整的响应。
    6.  返回处理后的字符串结果。

    Args:
        message (str): 用户的输入消息。
        system (dict): 包含LLM实例和配置的系统字典。
        function (str): 当前的功能类型 (e.g., 'doc_qa', 'general')。
        user_id (str, optional): 用户的唯一标识符。默认为 "default"。
        chat_history (list, optional): 对话历史列表，格式为 [{"role": "user/assistant", "content": "..."}]。
    
    Returns:
        str: 模型生成的完整回复文本。
    
    Raises:
        Exception: 如果在处理过程中发生任何错误，会记录日志并返回友好的错误消息。
    """
    try:
        # 使用传入的chat_history，如果没有则使用空列表
        if chat_history is None:
            chat_history = []
        
        # 记录调试信息
        logger.info(f"get_response收到chat_history长度: {len(chat_history)}")
        
        # 将chat_history转换为字符串格式
        history_text = ""
        for msg in chat_history[-10:]:  # 只使用最近10条记录，避免token过多
            role = "人类" if msg.get("role") == "user" else "AI助手"
            content = msg.get("content", "")
            history_text += f"{role}: {content}\n"
        
        logger.info(f"转换后的历史文本长度: {len(history_text)}")
        if history_text:
            logger.info(f"历史文本预览: {history_text[:200]}...")
        
        # 文档问答功能
        if function == "doc_qa":
            doc_qa_chain = init_doc_qa_system(system["llm"], user_id)
            try:
                result = doc_qa_chain.invoke({
                    "question": message,
                    "chat_history": history_text
                })
                return result
            except Exception as e:  
                logger.error(f"用户 {user_id} - 处理文档问答时出错: {str(e)}")
                return "处理文档时发生错误，请稍后再试"
        
        # 通用对话功能
        llm = system["llm"]
        role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是专业的游戏攻略助手，提供清晰、结构化的攻略步骤。\n" +
                "回答格式要求：\n" +
                "1. 问题分析：简要分析用户的问题\n" +
                "2. 所需条件：列出解决问题需要的物品、等级等条件\n" +
                "3. 步骤详解：分步骤说明解决方法，每步包含具体操作\n" +
                "4. 注意事项：提醒用户需要注意的地方\n" +
                "5. 替代方案：如果有其他解决方法，简要说明\n" +
                "请确保回答具体、可操作，避免模糊描述。如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识。\n" +
                "回答格式要求：\n" +
                "1. 基本信息：游戏名称、类型、平台、开发商、发行商、发布日期\n" +
                "2. 游戏简介：简要介绍游戏的核心玩法和特色\n" +
                "3. 剧情概要：如果有主要剧情线，简要描述\n" +
                "4. 主要角色：列出主要角色及其简介\n" +
                "5. 游戏特色：列举游戏的核心特色\n" +
                "6. 相关推荐：推荐2-3款类似游戏\n" +
                "请确保信息准确，结构清晰。如果不清楚，请说不知道。"
        }
        
        template = """你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
        {role_description}
        
        当前对话历史：
        {chat_history}
        
        人类: {input}
        AI助手:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # 创建处理链
        chain = (
            {
                "role_description": RunnableLambda(
                    lambda x: role_descriptions.get(
                        function,
                        "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
                    )
                ),
                "chat_history": RunnableLambda(lambda x: history_text),
                "input": itemgetter("input")
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        response = chain.invoke({"input": message})
        return response.strip()
        
    except Exception as e:
        logger.error(f"获取响应失败: {str(e)}")
        return "系统处理请求时出错，请稍后再试"

async def get_response_stream(message: str, system: dict, function: str, user_id: str = "default", chat_history: list = None):
    """
    以流式方式获取LLM的响应 (LCEL版本) - 异步流式版本。

    此函数是处理用户请求并以数据流形式实时返回响应的核心逻辑。
    它与 `get_response` 类似，但使用异步方法（`.astream()`）来逐块生成响应。

    主要流程：
    1.  与 `get_response` 同样地准备输入和历史记录。
    2.  如果功能是 'doc_qa'，初始化文档问答链并异步迭代其流式输出（`.astream()`）。
    3.  对于其他功能，构建通用的对话链。
    4.  异步迭代通用对话链的流式输出。
    5.  通过 `yield` 将每个响应块（chunk）返回给调用方（如FastAPI的 `StreamingResponse`）。

    这对于实现打字机效果的前端体验至关重要，可以显著提升应用的感知性能。

    Args:
        message (str): 用户的输入消息。
        system (dict): 包含LLM实例和配置的系统字典。
        function (str): 当前的功能类型 (e.g., 'doc_qa', 'general')。
        user_id (str, optional): 用户的唯一标识符。
        chat_history (list, optional): 对话历史列表。

    Yields:
        str: 模型生成的响应文本块。
    
    Raises:
        Exception: 如果在流式处理过程中发生任何错误，会记录日志并 `yield` 一条友好的错误消息。
    """
    try:
        # 使用传入的chat_history，如果没有则使用空列表
        if chat_history is None:
            chat_history = []
        
        # 将chat_history转换为字符串格式
        history_text = ""
        for msg in chat_history[-10:]:  # 只使用最近10条记录，避免token过多
            role = "人类" if msg.get("role") == "user" else "AI助手"
            content = msg.get("content", "")
            history_text += f"{role}: {content}\n"
        
        # 文档问答功能
        if function == "doc_qa":
            doc_qa_chain = init_doc_qa_system(system["llm"], user_id)
            try:
                # 使用 astream 进行流式处理
                full_response = ""
                async for chunk in doc_qa_chain.astream({
                    "question": message,
                    "chat_history": history_text
                }):
                    if chunk:
                        full_response += chunk
                        yield chunk
                
            except Exception as e:
                logger.error(f"用户 {user_id} - 处理文档问答时出错: {str(e)}")
                yield "处理文档时发生错误，请稍后再试"
        else:
            # 通用对话功能 - 创建临时链使用前端传入的历史记录
            llm = system["llm"]
            role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是专业的游戏攻略助手，提供清晰、结构化的攻略步骤。\n" +
                "回答格式要求：\n" +
                "1. 问题分析：简要分析用户的问题\n" +
                "2. 所需条件：列出解决问题需要的物品、等级等条件\n" +
                "3. 步骤详解：分步骤说明解决方法，每步包含具体操作\n" +
                "4. 注意事项：提醒用户需要注意的地方\n" +
                "5. 替代方案：如果有其他解决方法，简要说明\n" +
                "请确保回答具体、可操作，避免模糊描述。如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识。\n" +
                "回答格式要求：\n" +
                "1. 游戏名称、类型、平台、开发商、发行商、发布日期等基本信息\n" +
                "2. 游戏类型：如动作游戏、策略游戏、角色扮演游戏等\n" +
                "3. 游戏平台：如PC、 consoles、移动端等\n" +
                "4.游戏发行商：如 Electronic Arts、Ubisoft、Nintendo等\n" +
                "5.发布日期：游戏的发布日期\n"
                "6. 游戏简介：简要介绍游戏的核心玩法和特色\n" +
                "7. 剧情概要：如果有主要剧情线，简要描述\n" +
                "8. 主要角色：列出主要角色及其简介\n" +
                "9. 游戏特色：列举游戏的核心特色\n" +
                "10. 相关推荐：推荐2-3款类似游戏\n" +
                "请确保信息准确，结构清晰。如果不清楚，请说不知道。"
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
            
            # 使用前端传入的历史记录创建链
            chain = (
                {
                    "role_description": RunnableLambda(
                        lambda x: role_descriptions.get(
                            function,
                            "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。"
                        )
                    ),
                    "chat_history": RunnableLambda(lambda x: history_text),
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
            
    except Exception as e:
        logger.error(f"获取流式响应失败: {str(e)}")
        yield "系统处理请求时出错，请稍后再试"