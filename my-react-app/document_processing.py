import os
import shutil
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings  # 更新后的导入方式
import logging

# 禁用 ChromaDB 的遥测功能
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# 设置Chroma数据库路径
CHROMA_PATH = "chroma_db"
# 确保目录存在
os.makedirs(CHROMA_PATH, exist_ok=True)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_uploaded_file(file_path: str):
    """根据文件类型加载文档"""
    try:
        if file_path.endswith('.txt'):
            loader = TextLoader(file_path, encoding="utf-8")
        elif file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith('.docx') or file_path.endswith('.doc'):
            loader = Docx2txtLoader(file_path)
        else:
            raise ValueError("不支持的文件类型，请上传txt、pdf、docx或doc文件。")
        
        documents = loader.load()
        logger.info(f"成功加载文档: {file_path}, 页数: {len(documents)}")
        return documents
    except Exception as e:
        logger.error(f"文档加载失败: {str(e)}")
        raise

def split_documents(documents):
    """分割文档为适合处理的小块"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
        length_function=len,
        is_separator_regex=False
    )
    
    return text_splitter.split_documents(documents)

def init_embeddings():
    """初始化文本嵌入模型"""
    try:
         # 使用更新后的导入方式
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
        # 添加嵌入测试
        test_embedding = embeddings.embed_query("test")
        if not test_embedding or len(test_embedding) == 0:
            raise ValueError("嵌入模型返回空向量")
            
        logger.info("成功初始化嵌入模型，向量维度：%d", len(test_embedding))
        return embeddings
    except Exception as e:
        logger.error(f"嵌入模型初始化失败: {str(e)}")
        raise

def init_vector_store(documents):
    """初始化向量存储"""
    try:
        # 过滤空文档
        valid_docs = [doc for doc in documents if doc.page_content.strip()]
        if not valid_docs:
            raise ValueError("没有有效的文档内容可供处理")
            
        logger.info(f"有效文档数量: {len(valid_docs)}/{len(documents)}")
        
        embeddings = init_embeddings()
        vector_store = Chroma.from_documents(
            documents=valid_docs,
            embedding=embeddings,
            persist_directory=CHROMA_PATH
        )
        
        # 验证向量存储
        if vector_store._collection.count() == 0:
            raise ValueError("向量存储创建失败，未插入任何文档")
            
        logger.info(f"成功初始化向量存储, 文档块数: {len(valid_docs)}")
        return vector_store
    except Exception as e:
        logger.error(f"向量存储初始化失败: {str(e)}")
        raise

def clear_vector_store():
    """清除向量存储"""
    try:
        if os.path.exists(CHROMA_PATH):
            shutil.rmtree(CHROMA_PATH)
            logger.info(f"已清除向量存储: {CHROMA_PATH}")
        os.makedirs(CHROMA_PATH, exist_ok=True)
        logger.info("向量存储已重置")
    except Exception as e:
        logger.error(f"清除向量存储失败: {str(e)}")
        raise

def generate_document_summary(documents, max_length=500):
    """生成文档摘要"""
    try:
        content = " ".join([doc.page_content for doc in documents[:3]])
        if len(content) > max_length:
            return content[:max_length] + "..."
        return content
    except Exception as e:
        logger.error(f"生成摘要失败: {str(e)}")
        return "无法生成摘要"