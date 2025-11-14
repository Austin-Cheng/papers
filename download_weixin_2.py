import requests
import os
from urllib.parse import urlparse
import hashlib
from bs4 import BeautifulSoup
import re


def simple_crawl(url: str, save_dir: str = "html_files") -> dict:
    """
    简化的HTML爬取函数

    Args:
        url: 要爬取的URL
        save_dir: 保存目录

    Returns:
        包含结果的字典
    """
    # 创建保存目录
    os.makedirs(save_dir, exist_ok=True)
    wechat_parser = WeChatArticleParser()

    # 添加完整的请求头信息
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    }

    try:
        # 发送请求，添加headers和timeout
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # 设置编码
        response.encoding = response.apparent_encoding
        html_content = response.text

        parsed_html = wechat_parser.parse(html_content)

        # 生成文件名
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        path_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        filename = f"{domain}_{path_hash}.html"
        filepath = os.path.join(save_dir, filename)

        # 保存文件
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return {
            'success': True,
            'url': url,
            'filename': filename,
            'filepath': filepath,
            'content_length': len(html_content),
            'status_code': response.status_code
        }

    except Exception as e:
        return {
            'success': False,
            'url': url,
            'error': str(e)
        }


# 完整的微信公众号文章解析器类
class WeChatArticleParser:
    """微信公众号文章解析器"""

    def __init__(self):
        self.title_selectors = [
            'h1.rich_media_title#activity-name',
            'h1.rich_media_title',
            'h1'
        ]

        self.author_selectors = [
            'span.rich_media_meta_text',
            'span.rich_media_meta_nickname a#js_name'
        ]

        self.content_selectors = [
            'div.rich_media_content',
            '#js_content'
        ]

    def parse(self, html_content):
        """解析微信公众号文章"""
        soup = BeautifulSoup(html_content, 'html.parser')

        title = self._extract_title(soup)
        author = self._extract_author(soup)
        content = self._extract_content(soup)
        publish_date = self._extract_publish_date(soup)

        return {
            'title': title,
            'author': author,
            'content': content,
            'publish_date': publish_date,
            'content_length': len(content),
            'word_count': len(content.split())
        }

    def _extract_title(self, soup):
        """提取标题"""
        for selector in self.title_selectors:
            element = soup.select_one(selector)
            if element:
                title = element.get_text().strip()
                if title and len(title) > 3:
                    return title
        return "未知标题"

    def _extract_author(self, soup):
        """提取作者"""
        authors = []

        # 提取个人作者
        author_elements = soup.select('span.rich_media_meta_text')
        for element in author_elements:
            author_text = element.get_text().strip()
            if (author_text and
                    author_text != "原创" and
                    not any(word in author_text for word in ['阅读', '浏览', '点赞'])):
                authors.append(author_text)

        # 提取公众号名称
        profile_elements = soup.select('span.rich_media_meta_nickname a#js_name')
        for element in profile_elements:
            profile_name = element.get_text().strip()
            if profile_name and profile_name not in authors:
                authors.append(profile_name)

        return "、".join(authors) if authors else "未知作者"

    def _extract_content(self, soup):
        """提取正文内容"""
        for selector in self.content_selectors:
            content_div = soup.select_one(selector)
            if content_div:
                # 清理内容
                for element in content_div.find_all(['script', 'style', 'iframe']):
                    element.decompose()

                text_content = content_div.get_text(separator='\n')
                # text_content = re.sub(r'\s+', ' ', text_content)
                text_content = re.sub(r'\n\s*\n', '\n\n', text_content)

                return text_content.strip()

        return "未找到正文内容"

    def _extract_publish_date(self, soup):
        """提取发布日期"""
        # 查找可能的日期元素
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',
            r'\d{4}年\d{1,2}月\d{1,2}日',
            r'\d{1,2}月\d{1,2}日',
            r'\d{1,2}-\d{1,2}'
        ]

        # 在meta信息中查找
        meta_elements = soup.find_all('span', class_=re.compile('rich_media_meta'))
        for element in meta_elements:
            text = element.get_text().strip()
            for pattern in date_patterns:
                if re.search(pattern, text):
                    return text

        return "未知日期"


# 最简单的使用方式
def quick_crawl():
    """快速爬取示例"""
    url = "https://mp.weixin.qq.com/s/yiE8GJCmuxaxGNxSBGKrZw?scene=1&click_id=8"  # 替换为实际URL

    result = simple_crawl(url)
    if result['success']:
        print(f"成功爬取: {result['filename']}")
        print(f"文件大小: {result['content_length']} 字符")
        print(f"保存路径: {result['filepath']}")
    else:
        print(f"爬取失败: {result['error']}")


if __name__ == "__main__":
    quick_crawl()