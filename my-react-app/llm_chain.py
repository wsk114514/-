import os
from langchain.chains import ConversationChain, ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatTongyi
from langchain_chroma import Chroma  
from document_processing import CHROMA_PATH, init_embeddings, clear_vector_store
import logging
from langchain.schema import HumanMessage, AIMessage  # 添加消息类型

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
        
    )

class EmptyDocQAChain:
    """空文档问答链（当没有文档时使用）"""
    def __call__(self, *args, **kwargs):
        return {"answer": "不清楚文档内容，请上传文档内容后重试。"}
    
    def invoke(self,input_data, *args, **kwargs):
        return {"answer": "不清楚文档内容，请上传文档内容后重试。"}

def init_doc_qa_system(llm):
    """初始化文档问答系统"""
    global doc_qa_chain
    if doc_qa_chain is not None:
        return doc_qa_chain
    
    # 统一使用文档问答提示词模板
    qa_template = """你是睿玩智库的文档检索助手形态，请根据提供的文档内容回答问题。如果文档内容不包含答案，请回答"根据文档内容，我无法回答这个问题"。
    
    文档内容：
    {context}
    
    当前对话历史：
    {chat_history}

    人类: {question}
    AI助手:"""
    
    QA_PROMPT = PromptTemplate(
        template=qa_template, 
        input_variables=["context", "chat_history","question"]
    )
    
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
        memory=ConversationBufferMemory(
            memory_key="chat_history",
            output_key="answer",
            return_messages=True
        )
        # 使用新的初始化方式避免 chat_history 问题
        doc_qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": QA_PROMPT},
            verbose=True,
            output_key="answer"
        )
        logger.info("文档问答系统初始化成功")
        return doc_qa_chain
    except Exception as e:
        logger.error(f"文档问答系统初始化失败: {str(e)}")
        # 返回一个默认的问答链
        doc_qa_chain = EmptyDocQAChain()
        return doc_qa_chain

def init_system():
    """初始化对话系统"""
    try:
        llm = init_llm()
        memory = init_memory()
        
        # 默认提示词模板
        doc_qa_template = """你是一个AI助手，名字叫做睿玩智库。请使用中文，结合文档内容回答用户问题。注意：如果没有文档内容，必须回答：不清楚文档内容,请上传文档内容后重试。一定不要编造内容。

当前对话历史：
{history}

人类: {input}
AI助手:"""

        prompt = PromptTemplate(
            input_variables=["history", "input"],
            template=doc_qa_template
        )

        chain = ConversationChain(
            llm=llm,
            memory=memory,
            prompt=prompt,
            verbose=True  # 关闭详细日志
        )
        logger.info("对话系统初始化成功")
        return chain
    except Exception as e:
        logger.error(f"对话系统初始化失败: {str(e)}")
        # 返回一个简单的错误处理链
        return ConversationChain(
            llm=ChatTongyi(name="qwen-turbo", api_key="dummy_key"),
            memory=ConversationBufferMemory(),
            prompt=PromptTemplate(
                input_variables=["history", "input"],
                template="系统初始化失败，请检查配置。人类: {question} AI助手:"
            )
        )

def clear_memory(chain):
    """清除对话记忆"""
    global doc_qa_chain
    try:
        chain.memory.clear()
        logger.info("对话记忆已清除")
        
        if doc_qa_chain and hasattr(doc_qa_chain, 'memory'):
            doc_qa_chain.memory.clear()
            logger.info("文档问答记忆已清除")
        
        clear_vector_store()
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")

def get_response(message: str, chain: ConversationChain, function: str) -> str:

    role_descriptions = {
            "play": "你是睿玩智库的游戏推荐助手形态，根据用户的喜好推荐游戏，如果不清楚，请说不知道。",
            "game_guide": "你是睿玩智库的游戏攻略助手形态，精确，严谨地回答用户关于游戏的各种问题，如果不清楚，请说不知道。",
            "doc_qa": "你是睿玩智库的文档检索助手形态，根据文档内容回答问题，注意：如果没有传入文档内容，必须回答：不清楚文档内容，不要编造内容。",
            "game_wiki": "你是睿玩智库的游戏百科助手形态，提供游戏的详细信息和背景知识，如果不清楚，请说不知道。"
        }
    role_description = role_descriptions.get(function, 
            "你是睿玩智库的通用助手形态，帮助用户解决问题，如果不清楚，请说不知道。")
        
        # 更新提示词模板
    template = f"""你的名字叫做睿玩智库。你有多种形态，请用中文回答用户的问题。下面是你的形态描述：
{role_description}

当前对话历史：
{{history}}

人类: {{input}}
AI助手:"""
    """获取LLM响应"""
    try:
        # 文档问答功能
        if function == "doc_qa":
            doc_qa_chain = init_doc_qa_system(chain.llm)
            try:
                result=doc_qa_chain.invoke({"question": message})
                response=result["answer"]
                
                # 添加来源信息
                source_docs = result.get("source_documents", [])
                if source_docs:
                    sources = {os.path.basename(doc.metadata.get("source", "")) for doc in source_docs}
                    if sources:
                        source_info = "\n\n信息来源："
                        for i, source in enumerate(sources):
                            if source:  # 确保源文件名为非空
                                source_info += f"\n[{i+1}] {source}"
                        response += source_info
                return response
            except Exception as e:  
                logger.error(f"处理文档问答时出错: {str(e)}")
                return "处理文档时发生错误，请稍后再试"
        
        # 根据功能选择角色描述
        chain.prompt.template = template
        response = chain.invoke({"input": message})["response"]
        
        # 清理思考痕迹
        if "<think>" in response:
            parts = response.split("</think>")
            return parts[-1].strip()
        
        return response.strip()
    except Exception as e:
        logger.error(f"获取响应失败: {str(e)}")
        return "系统处理请求时出错，请稍后再试"