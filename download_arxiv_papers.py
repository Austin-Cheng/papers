import arxiv
import os
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import create_engine
import json


def advanced_paper_download(
        query,
        max_results=10,
        download_dir="./papers",
        categories=None,
        start_date=None,
        end_date=None
):
    """
    高级论文下载功能

    Args:
        query: 搜索词
        max_results: 最大结果数
        download_dir: 下载目录
        categories: 论文分类过滤
        [start_date, end_date]: 下载论文的时间范围
    """

    os.makedirs(download_dir, exist_ok=True)
    client = arxiv.Client()

    # 构建分类查询
    category_query = ""
    if categories:
        if isinstance(categories, str):
            categories = [categories]
        category_query = f" AND (cat:{" OR cat:".join(categories)})"

    # 构建时间查询
    date_query = ""

    start_date = start_date + '000000'
    end_date = end_date + '235959'
    date_query = f" AND submittedDate:[{start_date} TO {end_date}]"

    # 完整查询
    full_query = f"({query}){category_query}{date_query}"

    print(full_query)

    search = arxiv.Search(
        query=full_query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
        sort_order=arxiv.SortOrder.Descending
    )

    downloaded_papers = []

    for i, result in enumerate(client.results(search)):
        try:
            # 生成文件名：标题 + 作者
            authors_str = "_".join([author.name.split()[-1] for author in result.authors[:2]])
            filename = f"{result.title[:50]}_{authors_str}.pdf"
            filename = filename.replace("/", "-").replace("\\", "-").replace("'", "").replace(":", " ")
            filepath = os.path.join(download_dir, filename)

            # 下载论文
            print(result.title, result.entry_id, filename)
            res = result.download_pdf(filename=filepath)

            paper_info = {
                'id': result.entry_id,
                'title': result.title,
                'title_ch': None,
                'authors': [author.name for author in result.authors],
                'published': result.published,
                'summary': result.summary,
                'summary_ch': None,
                'categories': result.categories,
                'filepath': filename
            }

            downloaded_papers.append(paper_info)

            print(f"✅ 下载: {result.title}")
            print(f"   作者: {', '.join(paper_info['authors'][:3])}")
            print(f"   分类: {', '.join(paper_info['categories'])}")
            print(f"   文件: {filename}")
            print()

        except Exception as e:
            print(f"❌ 下载失败 {result.title}: {e}")

    return downloaded_papers


def save_papers_to_mysql_with_pandas(papers, db_config):
    """
    使用pandas将论文信息保存到MySQL数据库

    Args:
        papers: 论文信息列表
        db_config: 数据库配置字典
    """
    try:
        # 创建数据库连接字符串
        connection_string = f"mysql+pymysql://{db_config['user']}:{db_config['password']}@{db_config['host']}/{db_config['database']}"
        engine = create_engine(connection_string)
        # 转换数据为DataFrame

        if papers:
            df = pd.DataFrame(papers)
            # 处理JSON字段
            df['authors'] = df['authors'].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)
            df['categories'] = df['categories'].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)

            # 保存到数据库
            df.to_sql('papers', con=engine, if_exists='append', index=False)

            print(f"✅ 成功将 {len(papers)} 篇论文保存到数据库")

    except Exception as e:
        print(f"❌ 数据库操作出错: {e}")


if __name__ == "__main__":
    papers = advanced_paper_download(
        query="large language model",
        max_results=3,
        categories="cs.AI",
        start_date='20251101',
        end_date='20251104',
        download_dir="./llm_papers"
    )

    print(f"下载完成! 共下载 {len(papers)} 篇论文")

    db_config = {
        'host': 'localhost',
        'database': 'test',
        'user': 'root',
        'password': 'root123'
    }

    # 使用pandas保存到数据库
    save_papers_to_mysql_with_pandas(papers, db_config)