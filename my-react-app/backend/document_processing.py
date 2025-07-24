"""
document_processing.py - 文档处理与向量化模块

这是RAG（检索增强生成）系统的核心组件，负责：
1. 📄 多格式文档加载 - 支持TXT、PDF、DOCX文件
2. 🔤 智能文本分割 - 递归字符分割，保持语义完整性
3. 🧮 向量化存储 - 使用ChromaDB构建向量数据库
4. 🔍 相似性检索 - 基于嵌入向量的文档检索
5. 🗑️ 资源管理 - 自动内存管理和实例清理
6. 🌐 多编码支持 - 智能检测和处理多种文本编码

技术栈:
- LangChain: 文档加载和处理框架
- ChromaDB: 向量数据库
- Ollama Embeddings: 本地嵌入模型
- RecursiveCharacterTextSplitter: 智能文本分割

设计特色:
- 支持多种文档格式的统一处理
- 智能编码检测，兼容中文环境
- 资源生命周期自动管理
- 错误恢复和异常处理机制
"""

import os
import shutil
import time
import gc
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings  # 更新后的导入方式
import logging

# ========================= 环境配置 =========================

# 禁用 ChromaDB 的遥测功能，保护用户隐私
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# 设置Chroma数据库路径
CHROMA_PATH = "chroma_db"
# 确保目录存在
os.makedirs(CHROMA_PATH, exist_ok=True)

# ========================= 全局状态管理 =========================

# 全局变量用于跟踪活跃的向量存储实例
# 用于实现资源生命周期管理和内存优化
_active_vector_stores = []

# ========================= 日志配置 =========================

# 配置日志系统，便于调试和监控
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================= 文档加载处理 =========================

def process_uploaded_file(file_path: str):
    """
    根据文件类型加载文档
    
    功能说明：
    - 支持多种文档格式（TXT、PDF、DOCX）
    - 智能编码检测，优先中文编码
    - 统一的文档对象输出格式
    - 完善的错误处理机制
    
    Args:
        file_path (str): 上传文件的绝对路径
        
    Returns:
        list: LangChain文档对象列表
        
    Raises:
        ValueError: 不支持的文件格式或编码解析失败
        FileNotFoundError: 文件不存在
        
    Note:
        文本文件支持多种编码自动检测：utf-8, gbk, gb2312, utf-8-sig, latin-1
    """
    try:
        if file_path.endswith('.txt'):
            # 尝试多种编码方式加载文本文件
            # 优先使用中文编码，确保中文文档正常加载
            loader = None
            encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig', 'latin-1']
            
            for encoding in encodings:
                try:
                    loader = TextLoader(file_path, encoding=encoding)
                    documents = loader.load()
                    logger.info(f"成功使用 {encoding} 编码加载文本文件: {file_path}")
                    return documents
                except UnicodeDecodeError:
                    logger.warning(f"使用 {encoding} 编码加载失败，尝试下一种编码")
                    continue
                except Exception as e:
                    logger.warning(f"使用 {encoding} 编码时发生其他错误: {e}")
                    continue
            
            # 如果所有编码都失败，抛出错误
            raise ValueError(f"无法使用任何编码方式加载文本文件: {file_path}")
            
        elif file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith('.docx'):
            try:
                loader = Docx2txtLoader(file_path)
            except Exception as docx_error:
                logger.error(f"加载 .docx 文件失败: {docx_error}")
                raise ValueError(f"无法读取 .docx 文件。请确保文件未损坏且格式正确。错误信息: {str(docx_error)}")
        elif file_path.endswith('.doc'):
            # 对于旧版 .doc 文件，尝试使用 Docx2txtLoader（有时也能工作）
            try:
                loader = Docx2txtLoader(file_path)
                logger.info("尝试使用 Docx2txtLoader 处理 .doc 文件")
            except Exception as doc_error:
                logger.error(f"无法处理 .doc 文件: {doc_error}")
                raise ValueError(
                    "无法处理旧版 .doc 文件格式。建议解决方案：\n"
                    "1. 将文件另存为 .docx 格式后重新上传\n"
                    "2. 将文件另存为 .txt 格式后上传\n"
                    "3. 使用 Microsoft Word 或 LibreOffice 打开文件并保存为新格式"
                )
        else:
            raise ValueError("不支持的文件类型。支持的格式：txt、pdf、docx。对于 .doc 文件，请先转换为 .docx 格式。")
        
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
        # 首先尝试使用 Ollama 嵌入
        try:
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            # 测试嵌入是否工作
            test_embedding = embeddings.embed_query("test")
            if test_embedding and len(test_embedding) > 0:
                logger.info("使用 Ollama 嵌入模型")
                return embeddings
        except Exception as ollama_error:
            logger.warning(f"Ollama 嵌入不可用: {ollama_error}")
        
        
    except Exception as e:
        logger.error(f"嵌入模型初始化失败: {str(e)}")
        raise


def cleanup_vector_stores():
    """清理所有活跃的向量存储连接"""
    global _active_vector_stores
    try:
        for vector_store in _active_vector_stores:
            try:
                # 尝试关闭向量存储连接
                if hasattr(vector_store, '_client') and vector_store._client:
                    vector_store._client.reset()
                if hasattr(vector_store, '_collection'):
                    vector_store._collection = None
                logger.info("已关闭向量存储连接")
            except Exception as e:
                logger.warning(f"关闭向量存储连接时发生错误: {e}")
        
        _active_vector_stores.clear()
        
        # 强制垃圾回收
        gc.collect()
        
        # 等待一小段时间让系统释放文件句柄
        time.sleep(0.5)
        
    except Exception as e:
        logger.warning(f"清理向量存储连接失败: {e}")

def init_vector_store(documents):
    """初始化向量存储"""
    try:
        # 先清除任何现有的向量存储连接
        cleanup_vector_stores()
        
        # 过滤空文档
        valid_docs = [doc for doc in documents if doc.page_content.strip()]
        if not valid_docs:
            raise ValueError("没有有效的文档内容可供处理")
            
        logger.info(f"有效文档数量: {len(valid_docs)}/{len(documents)}")
        
        # 确保 Chroma 目录存在
        os.makedirs(CHROMA_PATH, exist_ok=True)
        
        embeddings = init_embeddings()
        logger.info("嵌入模型初始化成功")
        
        vector_store = Chroma.from_documents(
            documents=valid_docs,
            embedding=embeddings,
            persist_directory=CHROMA_PATH
        )
        
        # 跟踪活跃的向量存储实例
        _active_vector_stores.append(vector_store)
        
        # 验证向量存储
        try:
            count = vector_store._collection.count()
            if count == 0:
                raise ValueError("向量存储创建失败，未插入任何文档")
            logger.info(f"向量存储验证成功，文档数量: {count}")
        except Exception as verification_error:
            logger.warning(f"向量存储验证失败: {verification_error}，但继续处理")
            
        logger.info(f"成功初始化向量存储, 文档块数: {len(valid_docs)}")
        return vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}
        )
    except Exception as e:
        logger.error(f"向量存储初始化失败: {str(e)}")
        raise

def clear_vector_store():
    """清除向量存储"""
    try:
        # 首先清理所有活跃的向量存储连接
        cleanup_vector_stores()
        
        if os.path.exists(CHROMA_PATH):
            # 尝试多次删除，如果文件被占用则等待
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    shutil.rmtree(CHROMA_PATH)
                    logger.info(f"已清除向量存储: {CHROMA_PATH}")
                    break
                except PermissionError as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"文件被占用，等待后重试 (尝试 {attempt + 1}/{max_retries}): {e}")
                        time.sleep(1)
                        continue
                    else:
                        # 如果仍然无法删除，尝试清空目录内容
                        logger.warning(f"无法删除整个目录，尝试清空内容: {e}")
                        try:
                            for root, dirs, files in os.walk(CHROMA_PATH, topdown=False):
                                for file in files:
                                    try:
                                        os.remove(os.path.join(root, file))
                                    except:
                                        pass
                                for dir in dirs:
                                    try:
                                        os.rmdir(os.path.join(root, dir))
                                    except:
                                        pass
                            logger.info("已清空向量存储目录内容")
                        except Exception as cleanup_error:
                            logger.warning(f"清空目录内容也失败: {cleanup_error}")
                            # 记录错误但不抛出异常，避免阻塞其他操作
                            
        os.makedirs(CHROMA_PATH, exist_ok=True)
        logger.info("向量存储已重置")
    except Exception as e:
        logger.error(f"清除向量存储失败: {str(e)}")
        # 不抛出异常，避免阻塞其他清理操作

def clear_uploaded_files():
    """清除所有上传的文件"""
    try:
        from config import UPLOAD_DIR
        if os.path.exists(UPLOAD_DIR):
            # 删除上传目录中的所有文件
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        logger.info(f"已删除上传文件: {filename}")
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                        logger.info(f"已删除上传目录: {filename}")
                except Exception as file_error:
                    logger.warning(f"删除文件 {filename} 失败: {file_error}")
            logger.info("所有上传文件已清除")
        else:
            logger.info("上传目录不存在，无需清除")
    except Exception as e:
        logger.error(f"清除上传文件失败: {str(e)}")
        raise

def clear_all_document_data():
    """清除所有文档相关数据（向量存储和上传文件）"""
    errors = []
    
    # 分别尝试清除向量存储和上传文件，即使其中一个失败也继续执行另一个
    try:
        clear_vector_store()
        logger.info("向量存储清除完成")
    except Exception as e:
        error_msg = f"清除向量存储失败: {e}"
        logger.error(error_msg)
        errors.append(error_msg)
    
    try:
        clear_uploaded_files()
        logger.info("上传文件清除完成")
    except Exception as e:
        error_msg = f"清除上传文件失败: {e}"
        logger.error(error_msg)
        errors.append(error_msg)
    
    if errors:
        # 如果有错误，记录但不抛出异常
        logger.warning(f"文档数据清除过程中出现以下问题: {'; '.join(errors)}")
    else:
        logger.info("所有文档数据已清除")

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