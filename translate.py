
import pandas as pd
from sqlalchemy import create_engine, text
import json
from openai import OpenAI
import os


def translate_text_with_llm(client, text, source_lang="English", target_lang="Chinese"):
    """
    使用LLM翻译文本

    Args:
        client: OpenAI客户端
        text: 待翻译文本
        source_lang: 源语言
        target_lang: 目标语言

    Returns:
        翻译后的文本
    """
    try:
        messages = [
            {
                "role": "user",
                "content": f"Translate the following {source_lang} text to {target_lang}: {text}"
            }
        ]

        translation_options = {
            "source_lang": "auto",
            "target_lang": "Chinese"
        }

        completion = client.chat.completions.create(
            model="qwen-mt-turbo",  # 使用翻译模型
            messages=messages,
            extra_body={
                "translation_options": translation_options
            }
        )

        return completion.choices[0].message.content
    except Exception as e:
        print(f"❌ 翻译出错: {e}")
        return text  # 返回原文本以防翻译失败


def translate_papers_and_save(db_config):
    """
    从数据库读取论文数据，翻译标题和摘要，并保存回数据库

    Args:
        db_config: 数据库配置字典
    """
    try:
        # 创建数据库连接
        connection_string = f"mysql+pymysql://{db_config['user']}:{db_config['password']}@{db_config['host']}/{db_config['database']}"
        engine = create_engine(connection_string)

        # 从数据库读取数据
        query = "SELECT id, title, summary FROM papers WHERE title_ch IS NULL OR summary_ch IS NULL"
        df = pd.read_sql(query, engine)

        if df.empty:
            print("✅ 没有需要翻译的论文数据")
            return

        print(f"📝 需要翻译 {len(df)} 篇论文")

        # 初始化LLM客户端
        client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

        # 翻译标题和摘要
        translated_titles = []
        translated_summaries = []

        for index, row in df.iterrows():
            print(f"🔄 正在翻译第 {index + 1}/{len(df)} 篇论文: {row['title'][:50]}...")

            # 翻译标题
            translated_title = translate_text_with_llm(client, row['title'])
            translated_titles.append(translated_title)

            # 翻译摘要
            translated_summary = translate_text_with_llm(client, row['summary'])
            translated_summaries.append(translated_summary)

            print(f"   标题翻译: {translated_title[:50]}...")
            print(f"   摘要翻译: {translated_summary[:50]}...")

        # 添加翻译结果到DataFrame
        df['title_ch'] = translated_titles
        df['summary_ch'] = translated_summaries

        # 更新数据库中的记录
        for index, row in df.iterrows():
            update_query = text("""
            UPDATE papers 
            SET title_ch = :title_ch, summary_ch = :summary_ch
            WHERE id = :id
            """)
            with engine.connect() as connection:
                connection.execute(
                    update_query,
                    {"title_ch": row['title_ch'], "summary_ch": row['summary_ch'], "id": row['id']}
                )
                connection.commit()

        print(f"✅ 成功翻译并保存 {len(df)} 篇论文的中英文数据")

    except Exception as e:
        print(f"❌ 操作出错: {e}")


# 在主程序中调用
if __name__ == "__main__":
    # 数据库配置
    db_config = {
        'host': 'localhost',
        'database': 'test',
        'user': 'root',
        'password': 'root123'
    }

    # 翻译论文数据并保存
    translate_papers_and_save(db_config)
