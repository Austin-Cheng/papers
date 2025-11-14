# -*- coding: utf-8 -*-
import requests
import json
key = "JZLb23c845b8b6860e1"


url = "https://mp.weixin.qq.com/s/yiE8GJCmuxaxGNxSBGKrZw?scene=1&click_id=8"

url = f"https://www.dajiala.com/fbmain/monitor/v3/article_detail?url={url}&key={key}&mode=1"


payload = {}
headers = {}

response = requests.request("GET", url, headers=headers, data=payload)

content = json.loads(response.text)
print(content)
print(content['title'])
print(content['nick_name'])
print(content['author'])

