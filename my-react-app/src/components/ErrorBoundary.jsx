import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // 在生产环境中，你可以将错误记录到错误报告服务
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>🚧 出现了一些问题</h2>
            <p>抱歉，应用程序遇到了一个错误。</p>
            
            <div className="error-actions">
              <button 
                className="retry-btn"
                onClick={this.handleRetry}
              >
                🔄 重试
              </button>
              <button 
                className="reload-btn"
                onClick={() => window.location.reload()}
              >
                🔄 刷新页面
              </button>
            </div>

            {/* 开发环境下显示错误详情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>错误详情 (开发模式)</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
