/**
 * 用户认证和游戏收藏调试工具
 * 在浏览器控制台运行以检查用户状态
 */

window.debugUserAuth = function() {
  console.log('🔍 用户认证和游戏收藏调试工具');
  console.log('='.repeat(50));
  
  // 检查localStorage中的认证信息
  console.log('\n1. localStorage认证信息:');
  const authKey = 'auth_status';
  const userKey = 'user_data';
  
  console.log(`  ${authKey}:`, localStorage.getItem(authKey));
  console.log(`  ${userKey}:`, localStorage.getItem(userKey));
  
  // 检查游戏收藏数据
  console.log('\n2. localStorage游戏收藏数据:');
  const keys = Object.keys(localStorage);
  const gameCollectionKeys = keys.filter(key => key.includes('game_collection'));
  
  if (gameCollectionKeys.length === 0) {
    console.log('  没有找到游戏收藏数据');
  } else {
    gameCollectionKeys.forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      console.log(`  ${key}: ${data.length} 个游戏`);
      data.forEach((game, index) => {
        console.log(`    ${index + 1}. ${game.name}`);
      });
    });
  }
  
  // 检查React Context状态（如果可以访问的话）
  console.log('\n3. 建议在React DevTools中检查:');
  console.log('  - AuthContext的user状态');
  console.log('  - InputBar组件的getUserIdForGameCollection函数返回值');
  
  console.log('\n4. 预期行为:');
  console.log('  - 如果用户已登录，getUserIdForGameCollection应该返回用户名');
  console.log('  - 游戏收藏数据应该存储在game_collection_{username}键下');
  console.log('  - InputBar发送请求时应该使用正确的用户名获取游戏收藏');
  
  return {
    authInStorage: localStorage.getItem(authKey),
    userInStorage: localStorage.getItem(userKey),
    gameCollectionKeys,
    totalCollections: gameCollectionKeys.length
  };
};

// 检查是否是在浏览器环境
if (typeof window !== 'undefined') {
  console.log('🔧 用户认证调试工具已加载');
  console.log('使用方法: window.debugUserAuth()');
}
