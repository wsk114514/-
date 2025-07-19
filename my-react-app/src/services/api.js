// api.js

export async function getResponse(message, function_type) {
    try {
        const response = await fetch('/app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                function: function_type
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '网络错误，请稍后再试');
        }

        return data.response || '抱歉，我没有理解您的问题。';
    } catch (error) {
        // 捕获网络错误或JSON解析错误
        throw new Error(error.message || '网络请求失败，请检查后端服务是否正常运行');
    }
}

// 流式响应API
export async function getResponseStream(message, function_type, onChunk) {
    try {
        const response = await fetch('/app/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                function: function_type
            }),
        });

        if (!response.ok) {
            throw new Error('网络错误，请稍后再试');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // 添加延迟队列机制
        const chunkQueue = [];
        let isProcessing = false;

        // 处理队列中的块
        const processQueue = async () => {
            if (isProcessing || chunkQueue.length === 0) return;
            
            isProcessing = true;
            
            while (chunkQueue.length > 0) {
                const chunk = chunkQueue.shift();
                
                // 按字符逐个输出，增加丝滑感
                for (const char of chunk) {
                    onChunk(char);
                    // 每个字符之间添加30-50ms的延迟
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 30));
                }
                
                // 每个chunk之间稍微停顿
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            isProcessing = false;
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // 保留最后一行（可能不完整）
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // 去掉 "data: " 前缀

                        if (data === '[DONE]') {
                            // 确保队列处理完毕
                            while (chunkQueue.length > 0 || isProcessing) {
                                await new Promise(resolve => setTimeout(resolve, 10));
                            }
                            return; // 流式响应结束
                        }

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                chunkQueue.push(parsed.content);
                                processQueue(); // 不等待，让队列异步处理
                            } else if (parsed.error) {
                                throw new Error(parsed.error);
                            }
                        } catch (e) {
                            console.error("解析响应数据失败:", e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        throw new Error(error.message || '流式请求失败，请检查后端服务是否正常运行');
    }
}

// api.js
export async function clearMemory() {
    try {
        const response = await fetch('http://localhost:8000/memory/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('清除记忆失败');
        }

        return await response.json();
    } catch (error) {
        console.error('清除记忆失败:', error);
        throw error;
    }
}