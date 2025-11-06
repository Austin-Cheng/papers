const READ_PAPERS_KEY = 'readPapers';
const FAVORITE_PAPERS_KEY = 'favoritePapers';

// 获取本地存储的数据
function getLocalStorageData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return [];
    }
}

// 保存数据到本地存储
function setLocalStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
}

// 初始化已读和收藏状态
let readPapers = getLocalStorageData(READ_PAPERS_KEY);
let favoritePapers = getLocalStorageData(FAVORITE_PAPERS_KEY);
// API基础URL - 指向本地Tornado服务器
const API_BASE_URL = 'http://localhost:8889/api';
const PAPER_BASE_ADDR = 'file:///C:\\Users\\12390\\Documents\\projects\\papers\\papers'

// 从后端API获取论文数据
async function fetchPapers(params = {}) {
    try {
        // 构建查询参数
        const queryParams = new URLSearchParams();
        if (params.category) queryParams.append('category', params.category);
        if (params.search) queryParams.append('search', params.search);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);

        const url = `${API_BASE_URL}/papers?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'API返回错误');
        }

        return data.data || [];
    } catch (error) {
        console.error('获取论文数据失败:', error);
        throw error;
    }
}

// 渲染论文列表
function renderPapers(papers) {
    const container = document.getElementById('papersContainer');
    const countElement = document.getElementById('paperCount');

    if (papers.length === 0) {
        container.innerHTML = `                    <div class="empty-state">
                <h3>未找到匹配的论文</h3>
                <p>请尝试调整搜索条件或筛选器</p>
            </div>
        `;
        countElement.textContent = '0';
        return;
    }

    countElement.textContent = papers.length;

    const papersHTML = papers.map(paper => {
        const isRead = readPapers.includes(paper.paper_url);
        const isFavorite = favoritePapers.includes(paper.paper_url);

        return `                <div class="paper-card ${isRead ? 'read' : ''} ${isFavorite ? 'favorite' : ''}" id="paper-${escapeHtml(paper.paper_url || '')}">
            <div class="paper-header">
                <h2 class="paper-title">${escapeHtml(paper.title || '无标题')}</h2>
                <div class="paper-date">${formatDate(paper.published)}</div>
            </div>
            <div class="paper-authors">${formatAuthors(paper.authors)}</div>
            <div class="paper-summary">${escapeHtml(paper.summary || '无摘要')}</div>
            <div class="paper-actions">
                <button class="btn btn-primary" onclick="viewPaper('${escapeHtml(paper.paper_url || '')}')">查看原文</button>
                <button class="btn-read ${isRead ? 'active' : ''}" onclick="toggleReadStatus('${escapeHtml(paper.paper_url || '')}', this)" title="标记为已读">
                    ✓
                </button>
                <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavoriteStatus('${escapeHtml(paper.paper_url || '')}', this)" title="添加到收藏">
                    ♡
                </button>
                ${formatCategories(paper.categories)}                    </div>
        </div>
    `}).join('');

    container.innerHTML = papersHTML;
}


// 向服务器发送收藏状态
async function saveFavoriteStatusToServer(paperId, isFavorite) {
    try {
        const response = await fetch(`${API_BASE_URL}/status/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_favorite: isFavorite, paper_id: paperId})
        });

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('保存收藏状态到服务器失败:', error);
        throw error;
    }
}

// 向服务器发送已读状态
async function saveReadStatusToServer(paperId, isRead) {
    try {
        const response = await fetch(`${API_BASE_URL}/status/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_read: isRead, paper_id: paperId })
        });

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('保存已读状态到服务器失败:', error);
        throw error;
    }
}

// 从服务器获取用户的已读和收藏状态
async function loadUserPreferences() {
    try {
        // 获取已读论文列表
        const readResponse = await fetch(`${API_BASE_URL}/user/read_papers`);
        if (readResponse.ok) {
            const readData = await readResponse.json();
            if (readData.success) {
                readPapers = readData.data || [];
                setLocalStorageData(READ_PAPERS_KEY, readPapers);
            }
        }

        // 获取收藏论文列表
        const favoriteResponse = await fetch(`${API_BASE_URL}/user/favorite_papers`);
        if (favoriteResponse.ok) {
            const favoriteData = await favoriteResponse.json();
            if (favoriteData.success) {
                favoritePapers = favoriteData.data || [];
                setLocalStorageData(FAVORITE_PAPERS_KEY, favoritePapers);
            }
        }
    } catch (error) {
        console.error('从服务器加载用户偏好设置失败:', error);
    }
}

// 切换已读状态
 async function toggleReadStatus(paperId, buttonElement) {
    const paperCard = document.getElementById(`paper-${paperId}`);
    const isRead = readPapers.includes(paperId);
    const newReadStatus = !isRead;

    try {
        // 先更新UI状态，提升用户体验
        if (newReadStatus) {
            readPapers.push(paperId);
            paperCard.classList.add('read');
            buttonElement.classList.add('active');
        } else {
            readPapers = readPapers.filter(id => id !== paperId);
            paperCard.classList.remove('read');
            buttonElement.classList.remove('active');
        }

        // 保存到本地存储（备用）
        setLocalStorageData(READ_PAPERS_KEY, readPapers);

        // 发送到服务器
        await saveReadStatusToServer(paperId, newReadStatus);
    } catch (error) {
        console.error('切换已读状态失败:', error);
        alert('保存已读状态失败，请检查网络连接');

        // 回滚UI状态
        if (newReadStatus) {
            readPapers = readPapers.filter(id => id !== paperId);
            paperCard.classList.remove('read');
            buttonElement.classList.remove('active');
        } else {
            readPapers.push(paperId);
            paperCard.classList.add('read');
            buttonElement.classList.add('active');
        }
    }
}

// 切换收藏状态
async function toggleFavoriteStatus(paperId, buttonElement) {
    const paperCard = document.getElementById(`paper-${paperId}`);
    const isFavorite = favoritePapers.includes(paperId);
    const newFavoriteStatus = !isFavorite;

    try {
        // 先更新UI状态，提升用户体验
        if (newFavoriteStatus) {
            favoritePapers.push(paperId);
            paperCard.classList.add('favorite');
            buttonElement.classList.add('active');
            buttonElement.textContent = '♥';
        } else {
            favoritePapers = favoritePapers.filter(id => id !== paperId);
            paperCard.classList.remove('favorite');
            buttonElement.classList.remove('active');
            buttonElement.textContent = '♡';
        }

        // 保存到本地存储（备用）
        setLocalStorageData(FAVORITE_PAPERS_KEY, favoritePapers);

        // 发送到服务器
        await saveFavoriteStatusToServer(paperId, newFavoriteStatus);
    } catch (error) {
        console.error('切换收藏状态失败:', error);
        alert('保存收藏状态失败，请检查网络连接');

        // 回滚UI状态
        if (newFavoriteStatus) {
            favoritePapers = favoritePapers.filter(id => id !== paperId);
            paperCard.classList.remove('favorite');
            buttonElement.classList.remove('active');
            buttonElement.textContent = '♡';
        } else {
            favoritePapers.push(paperId);
            paperCard.classList.add('favorite');
            buttonElement.classList.add('active');
            buttonElement.textContent = '♥';
        }
    }
}

// ... 其他函数保持不变 ...

// 查看论文详情
function viewPaper(paperUrl) {
    if (!paperUrl) {
        alert('论文链接不存在');
        return;
    }
    // 在新窗口中打开论文链接
    window.open(paperUrl, '_blank');

    // 标记为已读（异步操作）
    const paperCard = document.getElementById(`paper-${paperUrl}`);
    if (paperCard && !readPapers.includes(paperUrl)) {
        const readButton = paperCard.querySelector('.btn-read');
        toggleReadStatus(paperUrl, readButton);
    }
}


// 格式化作者信息
function formatAuthors(authors) {
    if (!authors) return '未知作者';

    if (Array.isArray(authors)) {
        return authors.join(', ');
    }

    if (typeof authors === 'string') {
        return authors;
    }

    return '未知作者';
}

// 格式化分类标签
function formatCategories(categories) {
    if (!categories) return '';

    if (Array.isArray(categories)) {
        return categories.map(cat => `<span class="category-tag">${cat}</span>`).join('');
    }

    if (typeof categories === 'string') {
        return `<span class="category-tag">${categories}</span>`;
    }

    return '';
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知日期';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // 如果无法解析，返回原始字符串
        }

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('zh-CN', options);
    } catch (error) {
        return dateString;
    }
}

// HTML转义函数，防止XSS攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 搜索和筛选功能
async function filterPapers() {
    const searchTerm = document.getElementById('searchInput').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    try {
        // 构建API参数
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (categoryFilter) params.category = categoryFilter;

        const papers = await fetchPapers(params);

        // 客户端日期筛选
        let filteredPapers = papers;
        if (dateFilter) {
            filteredPapers = papers.filter(paper =>
                isWithinDays(paper.published, parseInt(dateFilter))
            );
        }

        // 按日期降序排序（确保顺序正确）
        filteredPapers.sort((a, b) => {
            const dateA = new Date(a.published || 0);
            const dateB = new Date(b.published || 0);
            return dateB - dateA;
        });

        renderPapers(filteredPapers);
    } catch (error) {
        document.getElementById('papersContainer').innerHTML = `                    <div class="error">
                <h3>加载论文数据时出错</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
}

// 检查日期是否在指定天数内
function isWithinDays(dateString, days) {
    if (!dateString) return false;

    try {
        const paperDate = new Date(dateString);
        if (isNaN(paperDate.getTime())) return false;

        const now = new Date();
        const diffTime = now - paperDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
    } catch (error) {
        return false;
    }
}

// 查看论文详情
function viewPaper(paperUrl) {
    if (!paperUrl) {
        alert('论文链接不存在');
        return;
    }
    // 在新窗口中打开论文链接
    window.open(paperUrl, '_blank');

    // 标记为已读
    const paperCard = document.getElementById(`paper-${paperUrl}`);
    if (paperCard && !readPapers.includes(paperUrl)) {
        const readButton = paperCard.querySelector('.btn-read');
        toggleReadStatus(paperUrl, readButton);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserPreferences();
    // 初始加载数据
    filterPapers();

    // 添加事件监听器
    document.getElementById('searchInput').addEventListener('input', filterPapers);
    document.getElementById('categoryFilter').addEventListener('change', filterPapers);
    document.getElementById('dateFilter').addEventListener('change', filterPapers);
});