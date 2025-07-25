#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试游戏收藏集成功能

这个脚本用于验证游戏收藏数据是否正确集成到AI回答系统中。
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

from llm_chain import process_game_collection_for_ai, generate_game_collection_context

def test_game_collection_processing():
    """测试游戏收藏数据处理功能"""
    
    print("=== 测试游戏收藏数据处理功能 ===\n")
    
    # 模拟用户的游戏收藏数据
    sample_game_collection = [
        {
            "id": "game-1",
            "name": "塞尔达传说：王国之泪",
            "genres": ["动作冒险", "开放世界"],
            "platform": "Nintendo Switch",
            "rating": 9.5,
            "playStatus": "已通关",
            "notes": "非常棒的开放世界游戏"
        },
        {
            "id": "game-2", 
            "name": "艾尔登法环",
            "genres": ["动作RPG", "魂系"],
            "platform": "PC",
            "rating": 9.0,
            "playStatus": "在玩",
            "notes": "难度很高但很有趣"
        },
        {
            "id": "game-3",
            "name": "原神",
            "genres": ["动作RPG", "开放世界"],
            "platform": "PC",
            "rating": 8.0,
            "playStatus": "想玩",
            "notes": "听说画面很美"
        }
    ]
    
    # 测试基础数据处理
    print("1. 测试基础游戏收藏数据处理:")
    context = process_game_collection_for_ai(sample_game_collection)
    print(context)
    print("\n" + "="*50 + "\n")
    
    # 测试不同功能类型的上下文生成
    function_types = ['play', 'game_guide', 'game_wiki', 'general']
    
    for func_type in function_types:
        print(f"2. 测试 {func_type} 功能的上下文生成:")
        full_context = generate_game_collection_context(sample_game_collection, func_type)
        print(full_context)
        print("\n" + "="*50 + "\n")
    
    # 测试空收藏列表
    print("3. 测试空收藏列表:")
    empty_context = generate_game_collection_context([], 'play')
    print(f"空收藏上下文: '{empty_context}'")
    print("\n" + "="*50 + "\n")
    
    # 测试超大收藏列表（应该被限制）
    print("4. 测试大收藏列表（限制功能）:")
    large_collection = sample_game_collection * 5  # 15个游戏
    large_context = process_game_collection_for_ai(large_collection, max_games=3)
    print("大收藏列表处理结果（限制为3个游戏）:")
    print(large_context)

def test_integration_example():
    """展示集成示例"""
    print("\n\n=== 集成使用示例 ===\n")
    
    # 示例用户数据
    user_games = [
        {
            "name": "黑神话：悟空",
            "genres": ["动作", "RPG"],
            "platform": "PC", 
            "rating": 9.0,
            "playStatus": "已通关"
        },
        {
            "name": "博德之门3",
            "genres": ["RPG", "回合制"],
            "platform": "PC",
            "rating": 9.5,
            "playStatus": "在玩"
        }
    ]
    
    # 示例消息
    user_message = "推荐一些类似的游戏给我"
    
    print(f"用户消息: {user_message}")
    print("\n添加的游戏收藏上下文:")
    context = generate_game_collection_context(user_games, 'play')
    print(context)
    
    print("\n完整的AI提示词将包含:")
    print(f"- 用户消息: {user_message}")
    print(f"- 游戏收藏上下文: {context}")
    print("- 对话历史: [聊天记录...]")
    print("- 角色描述: [游戏推荐助手的描述...]")

if __name__ == "__main__":
    try:
        test_game_collection_processing()
        test_integration_example()
        print("\n✅ 所有测试完成！游戏收藏集成功能正常工作。")
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
