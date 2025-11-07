import tornado.ioloop
import tornado.web
import tornado.escape
import json
import datetime
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text
import pandas as pd
import numpy as np
import math


class Paper:
    """论文数据模型"""

    def __init__(self, title: str, authors: List[str], summary: str, categories: List[str],
                 published: Optional[str] = None, paper_url: Optional[str] = None):
        self.paper_url = paper_url
        self.title = title
        self.authors = authors
        self.summary = summary
        self.categories = categories
        self.published = published or datetime.datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "paper_url": self.paper_url,
            "title": self.title,
            "authors": self.authors,
            "summary": self.summary,
            "categories": self.categories,
            "published": self.published
        }


class PaperStorage:
    """论文数据存储（模拟数据库）"""

    def __init__(self):
        self.papers: List[Paper] = []
        self.db_config = {
            'host': 'localhost',
            'database': 'test',
            'user': 'root',
            'password': 'root123'
        }

    def _initialize_sample_data(self):
        connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
        engine = create_engine(connection_string)

        # 从数据库读取数据
        query = "SELECT id, title, authors, summary_ch, categories, published FROM papers"
        df = pd.read_sql(query, engine)
        self.papers = []
        for row in df.to_dict(orient="records"):
            sample_paper = Paper(
                title=row["title"],
                authors=json.loads(row['authors']),
                summary=row['summary_ch'],
                categories=json.loads(row['categories']),
                published=row['published'].strftime('%Y-%m-%d %H:%M:%S'),
                paper_url=row['id']
            )
            self.papers.append(sample_paper)
        return self.papers

    def get_all_papers(self, sort_by_date: bool = True) -> List[Paper]:
        """获取所有论文"""
        papers = self._initialize_sample_data()
        # papers = self.papers.copy()
        if sort_by_date:
            papers.sort(key=lambda x: x.published, reverse=True)
        return papers

    def get_papers_by_category(self, category: str) -> List[Paper]:
        """根据分类获取论文"""
        return [paper for paper in self.papers if category in paper.categories]

    def search_papers(self, query: str) -> List[Paper]:
        """搜索论文"""
        query = query.lower()
        results = []
        for paper in self.papers:
            if (query in paper.title.lower() or
                    any(query in author.lower() for author in paper.authors) or
                    query in paper.summary.lower()):
                results.append(paper)
        return results

    def add_paper(self, paper_data: Dict[str, Any]) -> Paper:
        """添加新论文"""
        paper = Paper(
            title=paper_data["title"],
            authors=paper_data["authors"],
            summary=paper_data["summary"],
            categories=paper_data["categories"],
            published=paper_data.get("published"),
            paper_url=paper_data.get("paper_url")
        )
        self.papers.append(paper)
        return paper

    def get_read_papers(self) -> List[str]:
        """获取已读论文ID列表"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 查询已读论文ID
            query = "SELECT id FROM papers WHERE `read` = 1"
            df = pd.read_sql(query, engine)

            # 返回ID列表
            return df['id'].tolist()

        except Exception as e:
            print(f"获取已读论文失败: {e}")
            return []

    def get_favorite_papers(self) -> List[str]:
        """获取收藏论文ID列表"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 查询收藏论文ID
            query = "SELECT id FROM papers WHERE favorite = 1"
            df = pd.read_sql(query, engine)

            # 返回ID列表
            return df['id'].tolist()

        except Exception as e:
            print(f"获取收藏论文失败: {e}")
            return []

    def update_paper_read_status(self, paper_id: str, is_read: bool) -> bool:
        """更新论文阅读状态"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 更新数据库中的read字段
            with engine.connect() as connection:
                query = text("UPDATE papers SET `read` = :read_status WHERE id = :paper_id")
                result = connection.execute(query, {"read_status": 1 if is_read else 0, "paper_id": paper_id})
                connection.commit()

            return True

        except Exception as e:
            print(f"更新论文阅读状态失败: {e}")
            return False

    def update_paper_favorite_status(self, paper_id: str, is_favorite: bool) -> bool:
        """更新论文收藏状态"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 更新数据库中的favorite字段
            with engine.connect() as connection:
                query = text("UPDATE papers SET favorite = :favorite_status WHERE id = :paper_id")
                result = connection.execute(query, {"favorite_status": 1 if is_favorite else 0, "paper_id": paper_id})
                connection.commit()

            return True

        except Exception as e:
            print(f"更新论文收藏状态失败: {e}")
            return False

    def get_chinese_fulltext(self, paper_id: str) -> str:
        """获取论文中文全文"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 查询指定论文的中文全文
            query = text("SELECT fulltext_ch FROM papers WHERE id = :paper_id")
            df = pd.read_sql(query, engine, params={"paper_id": paper_id})
            print(query, df)

            if not df.empty:
                return df.iloc[0]['fulltext_ch'] or ""
            else:
                return ""

        except Exception as e:
            print(f"获取论文中文全文失败: {e}")
            return ""

    # 在 PaperStorage 类中添加获取标签的方法
    def get_custom_tags(self):
        """获取自定义标签体系（倒置树形结构）"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 查询所有标签
            query = "SELECT id, name, parent_id FROM tags ORDER BY parent_id, id"
            df = pd.read_sql(query, engine)

            # 构建树形结构
            tags_dict = {}
            root_tags = []

            # 创建标签对象
            for _, row in df.iterrows():
                tag = Tag(row['id'], row['name'], row['parent_id'])
                tags_dict[tag.id] = tag

            # 建立父子关系
            for tag in tags_dict.values():
                if tag.parent_id is None or tag.parent_id is np.nan or math.isnan(tag.parent_id):
                    root_tags.append(tag)
                else:
                    parent = tags_dict.get(tag.parent_id)
                    if parent:
                        parent.children.append(tag)

            # 转换为字典格式
            def tag_to_dict(tag):
                return {
                    "id": tag.id,
                    "name": tag.name,
                    "children": [tag_to_dict(child) for child in tag.children]
                }

            return [tag_to_dict(tag) for tag in root_tags]

        except Exception as e:
            print(f"获取自定义标签失败: {e}")
            return []

    def add_paper_tag(self, paper_id, tag_id):
        """为论文添加标签"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 插入标签关联记录
            with engine.connect() as connection:
                query = text("INSERT INTO paper_tags (paper_id, tag_id) VALUES (:paper_id, :tag_id)")
                result = connection.execute(query, {"paper_id": paper_id, "tag_id": tag_id})
                connection.commit()

            return True

        except Exception as e:
            print(f"为论文添加标签失败: {e}")
            return False

    def get_paper_tags(self, paper_id):
        """获取论文的自定义标签"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 查询论文的标签
            query = text("""
                SELECT t.id, t.name 
                FROM paper_tags pt 
                JOIN tags t ON pt.tag_id = t.id 
                WHERE pt.paper_id = :paper_id
            """)
            df = pd.read_sql(query, engine, params={"paper_id": paper_id})

            # 转换为字典格式
            tags = []
            for _, row in df.iterrows():
                tags.append({
                    "id": row['id'],
                    "name": row['name']
                })

            return tags

        except Exception as e:
            print(f"获取论文标签失败: {e}")
            return []

    def remove_paper_tag(self, paper_id, tag_id):
        """为论文删除标签"""
        try:
            connection_string = f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}/{self.db_config['database']}"
            engine = create_engine(connection_string)

            # 删除标签关联记录
            with engine.connect() as connection:
                query = text("DELETE FROM paper_tags WHERE paper_id = :paper_id AND tag_id = :tag_id")
                result = connection.execute(query, {"paper_id": paper_id, "tag_id": tag_id})
                connection.commit()

            return True

        except Exception as e:
            print(f"为论文删除标签失败: {e}")
            return False


class Tag:
    def __init__(self, id, name, parent_id=None):
        self.id = id
        self.name = name
        self.parent_id = parent_id
        self.children = []


class BaseHandler(tornado.web.RequestHandler):
    """基础处理器类"""
    def set_default_headers(self):
        """设置默认响应头"""
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers",
                        "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

    def options(self, *args):
        """处理OPTIONS请求（CORS预检）"""
        self.set_status(204)
        self.finish()


class PapersHandler(BaseHandler):
    """论文列表接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取论文列表"""
        try:
            # 获取查询参数
            category = self.get_argument("category", None)
            search = self.get_argument("search", None)
            limit = int(self.get_argument("limit", 100))
            offset = int(self.get_argument("offset", 0))

            # 获取论文数据
            if category:
                papers = self.storage.get_papers_by_category(category)
            elif search:
                papers = self.storage.search_papers(search)
            else:
                papers = self.storage.get_all_papers()

            # 分页处理
            total_count = len(papers)
            papers = papers[offset:offset + limit]

            # 转换为字典格式
            papers_data = [paper.to_dict() for paper in papers]

            # 返回JSON响应
            response = {
                "success": True,
                "data": papers_data,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                }
            }

            self.write(response)

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })

    async def post(self):
        """添加新论文（示例）"""
        try:
            data = tornado.escape.json_decode(self.request.body)

            # 验证必要字段
            required_fields = ["title", "authors", "summary", "categories"]
            for field in required_fields:
                if field not in data:
                    self.set_status(400)
                    self.write({
                        "success": False,
                        "error": f"Missing required field: {field}"
                    })
                    return

            # 添加论文
            paper = self.storage.add_paper(data)

            self.write({
                "success": True,
                "data": paper.to_dict()
            })

        except json.JSONDecodeError:
            self.set_status(400)
            self.write({
                "success": False,
                "error": "Invalid JSON data"
            })
        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


# 添加处理器
class PaperTagsHandler(BaseHandler):
    """论文标签接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取论文的自定义标签"""
        try:
            paper_id = self.get_argument("paper_id", None)
            tags = self.storage.get_paper_tags(paper_id)

            self.write({
                "success": True,
                "data": tags
            })

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class PaperDetailHandler(BaseHandler):
    """论文详情接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self, paper_id):
        """获取论文详情"""
        try:
            # 在实际应用中，这里应该从数据库查询特定论文
            # 这里简化处理，返回所有论文中匹配ID的第一个
            papers = self.storage.get_all_papers(sort_by_date=False)
            paper = next((p for p in papers if p.id == paper_id), None)

            if paper:
                self.write({
                    "success": True,
                    "data": paper.to_dict()
                })
            else:
                self.set_status(404)
                self.write({
                    "success": False,
                    "error": "Paper not found"
                })

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class UserReadPapersHandler(BaseHandler):
    """用户已读论文接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取用户已读论文列表"""
        try:
            read_paper_ids = self.storage.get_read_papers()

            response = {
                "success": True,
                "data": read_paper_ids
            }

            self.write(response)

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class UserFavoritePapersHandler(BaseHandler):
    """用户收藏论文接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取用户收藏论文列表"""
        try:
            favorite_paper_ids = self.storage.get_favorite_papers()

            response = {
                "success": True,
                "data": favorite_paper_ids
            }

            self.write(response)

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class PaperReadHandler(BaseHandler):
    """论文阅读状态接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def post(self):
        """更新论文阅读状态"""
        try:
            # 解析请求体中的JSON数据
            data = tornado.escape.json_decode(self.request.body)
            is_read = data.get("is_read", False)
            paper_id = data.get("paper_id", False)

            # 更新数据库中的阅读状态
            success = self.storage.update_paper_read_status(paper_id, is_read)

            if success:
                self.write({
                    "success": True,
                    "message": "阅读状态更新成功"
                })
            else:
                self.set_status(500)
                self.write({
                    "success": False,
                    "error": "更新阅读状态失败"
                })

        except json.JSONDecodeError:
            self.set_status(400)
            self.write({
                "success": False,
                "error": "无效的JSON数据"
            })
        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class PaperFavoriteHandler(BaseHandler):
    """论文收藏状态接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def post(self):
        """更新论文收藏状态"""
        try:
            # 解析请求体中的JSON数据
            data = tornado.escape.json_decode(self.request.body)
            is_favorite = data.get("is_favorite", False)
            paper_id = data.get("paper_id", False)

            # 更新数据库中的收藏状态
            success = self.storage.update_paper_favorite_status(paper_id, is_favorite)

            if success:
                self.write({
                    "success": True,
                    "message": "收藏状态更新成功"
                })
            else:
                self.set_status(500)
                self.write({
                    "success": False,
                    "error": "更新收藏状态失败"
                })

        except json.JSONDecodeError:
            self.set_status(400)
            self.write({
                "success": False,
                "error": "无效的JSON数据"
            })
        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class ChineseFullTextHandler(BaseHandler):
    """论文中文全文接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取论文中文全文"""
        try:
            # 获取查询参数
            paper_id = self.get_argument("paper_id", None)

            if not paper_id:
                self.set_status(400)
                self.write({
                    "success": False,
                    "error": "缺少必要的参数: paper_id"
                })
                return

            # 获取中文全文内容
            fulltext = self.storage.get_chinese_fulltext(paper_id)

            self.write({
                "success": True,
                "data": {
                    "fulltext": fulltext
                }
            })

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


# 添加标签处理器
class TagsHandler(BaseHandler):
    """自定义标签接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def get(self):
        """获取自定义标签体系"""
        try:
            tags = self.storage.get_custom_tags()
            # tags = [
            #     {
            #         "id": 1,
            #         "name": "计算机科学",
            #         "children": [
            #             {
            #                 "id": 2,
            #                 "name": "人工智能",
            #                 "children": [
            #                     {
            #                         "id": 3,
            #                         "name": "机器学习",
            #                         "children": []
            #                     }
            #                 ]
            #             }
            #         ]
            #     },
            #     {
            #         "id": 4,
            #         "name": "数学",
            #         "children": []
            #     }
            # ]
            self.write({
                "success": True,
                "data": tags
            })

        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


class PaperTagHandler(BaseHandler):
    """论文标签接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def post(self):
        """为论文添加标签"""
        try:
            data = tornado.escape.json_decode(self.request.body)
            tag_id = data.get("tag_id")
            paper_id = data.get("paper_id")

            if not tag_id:
                self.set_status(400)
                self.write({
                    "success": False,
                    "error": "缺少必要的参数: tag_id"
                })
                return

            success = self.storage.add_paper_tag(paper_id, tag_id)

            if success:
                self.write({
                    "success": True,
                    "message": "标签添加成功"
                })
            else:
                self.set_status(500)
                self.write({
                    "success": False,
                    "error": "标签添加失败"
                })

        except json.JSONDecodeError:
            self.set_status(400)
            self.write({
                "success": False,
                "error": "无效的JSON数据"
            })
        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


# 添加删除标签的处理器类
class DeletePaperTagHandler(BaseHandler):
    """删除论文标签接口"""

    def initialize(self, storage: PaperStorage):
        self.storage = storage

    async def post(self):
        """为论文删除标签"""
        try:
            data = tornado.escape.json_decode(self.request.body)
            tag_id = data.get("tag_id")
            paper_id = data.get("paper_id")

            if not tag_id:
                self.set_status(400)
                self.write({
                    "success": False,
                    "error": "缺少必要的参数: tag_id"
                })
                return

            success = self.storage.remove_paper_tag(paper_id, tag_id)

            if success:
                self.write({
                    "success": True,
                    "message": "标签删除成功"
                })
            else:
                self.set_status(500)
                self.write({
                    "success": False,
                    "error": "标签删除失败"
                })

        except json.JSONDecodeError:
            self.set_status(400)
            self.write({
                "success": False,
                "error": "无效的JSON数据"
            })
        except Exception as e:
            self.set_status(500)
            self.write({
                "success": False,
                "error": str(e)
            })


def make_app():
    """创建Tornado应用"""
    storage = PaperStorage()

    return tornado.web.Application([
        (r"/api/papers", PapersHandler, {"storage": storage}),
        (r"/api/papers/([^/]+)", PaperDetailHandler, {"storage": storage}),
        (r"/api/user/read_papers", UserReadPapersHandler, {"storage": storage}),
        (r"/api/user/favorite_papers", UserFavoritePapersHandler, {"storage": storage}),
        (r"/api/status/read", PaperReadHandler, {"storage": storage}),
        (r"/api/status/favorite", PaperFavoriteHandler, {"storage": storage}),
        (r"/api/chinese_fulltext", ChineseFullTextHandler, {"storage": storage}),
        (r"/api/tags", TagsHandler, {"storage": storage}),  # 自定义标签接口
        (r"/api/tags/save", PaperTagHandler, {"storage": storage}),
        (r"/api/tags/load", PaperTagsHandler, {"storage": storage}),
        (r"/api/tags/delete", DeletePaperTagHandler, {"storage": storage}),
    ])


if __name__ == "__main__":
    # 启动服务器
    app = make_app()
    app.listen(8889)
    print("论文API服务已启动: http://localhost:8889")
    print("API端点:")
    print("  GET  /api/papers - 获取论文列表")
    print("  POST /api/papers - 添加新论文")
    print("  GET  /api/papers/{id} - 获取论文详情")

    try:
        tornado.ioloop.IOLoop.current().start()
    except KeyboardInterrupt:
        print("\n服务器已停止")



