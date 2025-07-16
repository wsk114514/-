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

// api.js
export async function clearMemory() {
    try {
        const response = await fetch('/clear-memory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('清除记忆失败');
        }
    } catch (error) {
        throw new Error(error.message || '网络请求失败，请检查后端服务是否正常运行');
    }
}