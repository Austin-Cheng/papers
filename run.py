#!/usr/bin/env python3
import os
import subprocess
import sys
import time
import webbrowser
from threading import Thread


def start_tornado():
    """启动Tornado服务器"""
    os.system("python server.py")


def start_http_server():
    """启动HTTP静态文件服务器"""
    os.chdir("static")
    os.system("python -m http.server 8000")


if __name__ == "__main__":
    print("启动论文系统...")

    # 确保static目录存在
    if not os.path.exists("static"):
        os.makedirs("static")
        print("请将index.html放入static目录")
        sys.exit(1)

    # 启动Tornado服务器（后台线程）
    # tornado_thread = Thread(target=start_tornado)
    # tornado_thread.daemon = True
    # tornado_thread.start()

    # 等待Tornado启动
    time.sleep(2)

    # 启动HTTP服务器并打开浏览器
    os.system("python -m http.server 8000 --directory static")

    # 自动打开浏览器
    webbrowser.open("http://192.168.31.144:8000")
