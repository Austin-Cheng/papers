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
// let readPapers = getLocalStorageData(READ_PAPERS_KEY);
// let favoritePapers = getLocalStorageData(FAVORITE_PAPERS_KEY);
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

// 修改 renderPapers 函数实现虚拟滚动
// function renderPapers(papers) {
//     const container = document.getElementById('papersContainer');
//     const countElement = document.getElementById('paperCount');
//
//     if (papers.length === 0) {
//         container.innerHTML = `<div class="empty-state">
//                 <h3>未找到匹配的论文</h3>
//                 <p>请尝试调整搜索条件或筛选器</p>
//             </div>`;
//         countElement.textContent = '0';
//         return;
//     }
//
//     countElement.textContent = papers.length;
//
//     // 只渲染前50个元素，提高初始加载速度
//     const visiblePapers = papers.slice(0, 4);
//     const papersHTML = visiblePapers.map(paper => {
//         const isRead = paper.is_read || false;
//         const isFavorite = paper.is_favorite || false;
//         paperCustomTags[paper.paper_url] = paper.custom_tags || [];
//
//         return `<div class="paper-card ${isRead ? 'read' : ''} ${isFavorite ? 'favorite' : ''}" id="paper-${escapeHtml(paper.paper_url || '')}">
//             <div class="paper-header">
//                 <h2 class="paper-title">${escapeHtml(paper.title || '无标题')}</h2>
//                 <div class="paper-date">${formatDate(paper.published)}</div>
//             </div>
//             <div class="paper-authors">${formatAuthors(paper.authors)}</div>
//             <div class="paper-summary">${escapeHtml(paper.summary || '无摘要')}</div>
//             <div class="paper-actions">
//                 <button class="btn btn-primary" onclick="viewPaper('${escapeHtml(paper.paper_url || '')}')">查看原文</button>
//                 <button class="btn-read ${isRead ? 'active' : ''}" onclick="toggleReadStatus('${escapeHtml(paper.paper_url || '')}', this)" title="标记为已读">
//                     ✓
//                 </button>
//                 <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavoriteStatus('${escapeHtml(paper.paper_url || '')}', this)" title="添加到收藏">
//                     ${isFavorite ? '♥' : '♡'}
//                 </button>
//                 <button class="btn btn-outline" onclick="showCustomTagsSelector('${escapeHtml(paper.paper_url || '')}')" title="添加自定义标签">
//                   标签
//                 </button>
//                 ${formatCategoriesWithCustom(paper)}
//             </div>
//         </div>`;
//     }).join('');
//
//     container.innerHTML = papersHTML;
//
//     // 使用 Intersection Observer 实现无限滚动
//     if (papers.length > 4) {
//         const loadMoreDiv = document.createElement('div');
//         loadMoreDiv.id = 'load-more';
//         loadMoreDiv.textContent = '加载更多...';
//         loadMoreDiv.style.textAlign = 'center';
//         loadMoreDiv.style.padding = '20px';
//         container.appendChild(loadMoreDiv);
//
//         // 添加滚动事件监听
//         setupInfiniteScroll(papers, 50);
//     }
// }

// 在 renderPapers 函数中确保正确设置 paperCustomTags
function renderPapers(papers) {
    const container = document.getElementById('papersContainer');
    const countElement = document.getElementById('paperCount');

    if (papers.length === 0) {
        container.innerHTML = `<div class="empty-state">
                <h3>未找到匹配的论文</h3>
                <p>请尝试调整搜索条件或筛选器</p>
            </div>`;
        countElement.textContent = '0';
        return;
    }

    countElement.textContent = papers.length;

    // 只渲染前50个元素，提高初始加载速度
    const visiblePapers = papers.slice(0, 50);
    const papersHTML = visiblePapers.map(paper => {
        const isRead = paper.is_read || false;
        const isFavorite = paper.is_favorite || false;
        // 确保这里正确缓存自定义标签数据
        paperCustomTags[paper.paper_url] = paper.custom_tags || [];

        return `<div class="paper-card ${isRead ? 'read' : ''} ${isFavorite ? 'favorite' : ''}" id="paper-${escapeHtml(paper.paper_url || '')}">
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
                    ${isFavorite ? '♥' : '♡'}
                </button>
                <button class="btn btn-outline" onclick="showCustomTagsSelector('${escapeHtml(paper.paper_url || '')}')" title="添加自定义标签">
                  标签
                </button>
                ${formatCategoriesWithCustom(paper)}
            </div>
        </div>`;
    }).join('');

    container.innerHTML = papersHTML;

    // 使用 Intersection Observer 实现无限滚动
    if (papers.length > 50) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.id = 'load-more';
        loadMoreDiv.textContent = '加载更多...';
        loadMoreDiv.style.textAlign = 'center';
        loadMoreDiv.style.padding = '20px';
        container.appendChild(loadMoreDiv);

        // 添加滚动事件监听
        setupInfiniteScroll(papers, 50);
    }
}


// 渲染论文列表
// function renderPapers(papers) {
//     const container = document.getElementById('papersContainer');
//     const countElement = document.getElementById('paperCount');
//
//     if (papers.length === 0) {
//         container.innerHTML = `                    <div class="empty-state">
//                 <h3>未找到匹配的论文</h3>
//                 <p>请尝试调整搜索条件或筛选器</p>
//             </div>
//         `;
//         countElement.textContent = '0';
//         return;
//     }
//
//     countElement.textContent = papers.length;
//
//     const papersHTML = papers.map(paper => {
//         const isRead = paper.is_read || false;
//         const isFavorite = paper.is_favorite || false;
//         paperCustomTags[paper.paper_url] = paper.custom_tags || [];
//
//         return `<div class="paper-card ${isRead ? 'read' : ''} ${isFavorite ? 'favorite' : ''}" id="paper-${escapeHtml(paper.paper_url || '')}">
//             <div class="paper-header">
//                 <h2 class="paper-title">${escapeHtml(paper.title || '无标题')}</h2>
//                 <div class="paper-date">${formatDate(paper.published)}</div>
//             </div>
//             <div class="paper-authors">${formatAuthors(paper.authors)}</div>
//             <div class="paper-summary">${escapeHtml(paper.summary || '无摘要')}</div>
//             <div class="paper-actions">
//                 <button class="btn btn-primary" onclick="viewPaper('${escapeHtml(paper.paper_url || '')}')">查看原文</button>
//                 <button class="btn-read ${isRead ? 'active' : ''}" onclick="toggleReadStatus('${escapeHtml(paper.paper_url || '')}', this)" title="标记为已读">
//                     ✓
//                 </button>
//                 <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavoriteStatus('${escapeHtml(paper.paper_url || '')}', this)" title="添加到收藏">
//                     ${isFavorite ? '♥' : '♡'}                </button>
//                 <button class="btn btn-outline" onclick="showCustomTagsSelector('${escapeHtml(paper.paper_url || '')}')" title="添加自定义标签">
//                   标签
//                 </button>
//                 ${formatCategoriesWithCustom(paper)}            </div>
//         </div>`;
//     }).join('');
//
//     container.innerHTML = papersHTML;
// }

// 在页面加载时预加载所有论文的自定义标签
// async function preloadPaperTags(papers) {
//     // 为提高性能，可以只加载前几篇论文的标签
//     const promises = papers.slice(0, 10).map(async paper => {
//         const tags = await loadPaperCustomTags(paper.paper_url);
//         paperCustomTags[paper.paper_url] = tags;
//     });
//
//     await Promise.all(promises);
// }

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

// 添加自定义标签相关变量
let customTags = []; // 存储从数据库加载的自定义标签

// 从服务器获取自定义标签体系
async function loadCustomTags() {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                customTags = data.data || [];
            }
        }
    } catch (error) {
        console.error('加载自定义标签失败:', error);
    }
}

// 添加全局变量存储论文的自定义标签
let paperCustomTags = {}; // {paperId: [tagIds]}

// 从服务器获取论文的自定义标签
// async function loadPaperCustomTags(paperId) {
//     console.log('正在调用 loadPaperCustomTags，paperId:', paperId);
//     console.trace('调用堆栈:');
//     try {
//         const response = await fetch(`${API_BASE_URL}/tags/load?paper_id=${paperId}`);
//         if (response.ok) {
//             const data = await response.json();
//             if (data.success) {
//                 return data.data || [];
//             }
//         }
//     } catch (error) {
//         console.error('加载论文自定义标签失败:', error);
//     }
//     return [];
// }

// 修改 renderPapers 函数，在格式化分类标签部分添加自定义标签显示
// function formatCategoriesWithCustom(paper) {
//     let categoriesHTML = formatCategories(paper.categories);
//
//     // 获取该论文的自定义标签
//     const customTagsForPaper = paperCustomTags[paper.paper_url] || [];
//
//     // 添加更漂亮的自定义标签显示
//     if (customTagsForPaper.length > 0) {
//         const customTagsHTML = customTagsForPaper.map(tag => `            <span class="custom-tag" style="
//                 display: inline-block;
//                 background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                 color: white;
//                 padding: 4px 12px;
//                 border-radius: 20px;
//                 font-size: 12px;
//                 font-weight: 500;
//                 margin: 2px 4px;
//                 box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//                 transition: all 0.3s ease;
//                 cursor: pointer;
//             " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
//                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
//                 ${escapeHtml(tag.name)}            </span>
//         `).join('');
//         categoriesHTML += customTagsHTML;
//     }
//
//     return categoriesHTML;
// }

// 切换标签删除按钮显示状态
function toggleTagDeleteButton(tagElement, paperId, tagId) {
    const wrapper = tagElement.parentElement;
    const deleteButton = wrapper.querySelector('.delete-tag');

    // 隐藏其他标签的删除按钮
    const allDeleteButtons = document.querySelectorAll('.delete-tag');
    allDeleteButtons.forEach(btn => {
        if (btn !== deleteButton) {
            btn.style.display = 'none';
        }
    });

    // 切换当前标签的删除按钮显示状态
    if (deleteButton.style.display === 'none') {
        deleteButton.style.display = 'block';
    } else {
        deleteButton.style.display = 'none';
    }
}

// 添加更新论文卡片标签显示的函数
function updatePaperCardTags(paperId) {
    // 找到对应的论文卡片
    const paperCard = document.getElementById(`paper-${paperId}`);
    if (!paperCard) return;

    // 找到标签显示区域（paper-actions div）
    const actionsDiv = paperCard.querySelector('.paper-actions');
    if (!actionsDiv) return;

    // 重新生成标签HTML（保留原有的分类标签）
    const paper = getCurrentPaperById(paperId); // 需要实现这个函数来获取论文数据
    if (paper) {
        // 重新渲染标签部分
        const categoriesHTML = formatCategories(paper.categories);
        const customTagsForPaper = paperCustomTags[paperId] || [];

        let newTagsHTML = categoriesHTML;
        if (customTagsForPaper.length > 0) {
            const customTagsHTML = customTagsForPaper.map(tag => `                <span class="custom-tag-wrapper" style="display: inline-block; position: relative; margin: 2px 4px;">
                    <span class="custom-tag" style="
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 4px 12px 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 500;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                        cursor: pointer;
                        position: relative;
                    " onclick="toggleTagDeleteButton(this, '${escapeHtml(paperId)}', ${tag.id})" 
                       onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';" 
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
                        ${escapeHtml(tag.name)}                    </span>
                    <span class="delete-tag" style="
                        display: none;
                        position: absolute;
                        top: -6px;
                        right: -4px;
                        background: #ff4757;
                        color: white;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        font-size: 10px;
                        text-align: center;
                        line-height: 16px;
                        cursor: pointer;
                        font-weight: bold;
                    " onclick="deletePaperTag('${escapeHtml(paperId)}', ${tag.id}, '${escapeHtml(tag.name)}', event)">×</span>
                </span>
            `).join('');
            newTagsHTML += customTagsHTML;
        }

        // 替换原有标签内容
        actionsDiv.innerHTML = actionsDiv.innerHTML.replace(
            /(<button class="btn btn-primary".*?>查看原文<\/button>.*$)/,
            `$1 ${newTagsHTML}`
        );
    }
}

async function deletePaperTag(paperId, tagId, tagName, event) {
    // 阻止事件冒泡
    event.stopPropagation();

    if (!confirm(`确定要删除标签 "${tagName}" 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tags/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tag_id: tagId, paper_id: paperId })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // 从本地缓存中移除标签
                if (paperCustomTags[paperId]) {
                    paperCustomTags[paperId] = paperCustomTags[paperId].filter(tag => tag.id !== tagId);
                }

                // 直接更新当前论文卡片的标签显示
                updatePaperCardTagsDisplay(paperId);

                alert(`成功删除标签: ${tagName}`);
            } else {
                alert('删除标签失败: ' + (result.error || '未知错误'));
            }
        } else {
            alert('删除标签失败，请检查网络连接');
        }
    } catch (error) {
        console.error('删除自定义标签失败:', error);
        alert('删除标签失败: ' + error.message);
    }
}

// 根据ID查找论文数据
function findPaperById(paperId) {
    // 这里需要根据实际情况实现获取论文数据的逻辑
    // 可以从当前显示的论文列表中查找
    const container = document.getElementById('papersContainer');
    if (container) {
        const paperCards = container.querySelectorAll('.paper-card');
        for (let card of paperCards) {
            if (card.id === `paper-${paperId}`) {
                // 从卡片中提取信息（简化实现）
                return {
                    categories: [] // 可以根据需要进一步实现
                };
            }
        }
    }
    return null;
}

// 更新指定论文卡片的标签显示
// 更新指定论文卡片的标签显示
function updatePaperCardTagsDisplay(paperId) {
    // 找到对应的论文卡片
    const paperCard = document.getElementById(`paper-${paperId}`);
    if (!paperCard) return;

    // 找到标签显示区域（paper-actions div）
    const actionsDiv = paperCard.querySelector('.paper-actions');
    if (!actionsDiv) return;

    // 获取分类标签HTML（保持原有的分类标签）
    const paper = findPaperById(paperId);
    let categoriesHTML = '';
    if (paper) {
        categoriesHTML = formatCategories(paper.categories);
    }

    // 获取该论文的自定义标签
    const customTagsForPaper = paperCustomTags[paperId] || [];

    // 生成自定义标签HTML
    let customTagsHTML = '';
    if (customTagsForPaper.length > 0) {
        customTagsHTML = customTagsForPaper.map(tag => `
            <span class="custom-tag-wrapper" style="display: inline-block; position: relative; margin: 2px 4px;">
                <span class="custom-tag" style="
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 4px 12px 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                " onclick="toggleTagDeleteButton(this, '${escapeHtml(paperId)}', ${tag.id})" 
                   onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';" 
                   onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
                    ${escapeHtml(tag.name)}
                </span>
                <span class="delete-tag" style="
                    display: none;
                    position: absolute;
                    top: -6px;
                    right: -4px;
                    background: #ff4757;
                    color: white;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    font-size: 10px;
                    text-align: center;
                    line-height: 16px;
                    cursor: pointer;
                    font-weight: bold;
                " onclick="deletePaperTag('${escapeHtml(paperId)}', ${tag.id}, '${escapeHtml(tag.name)}', event)">×</span>
            </span>
        `).join('');
    }

    // 保留按钮部分的HTML
    const buttonsHTML = `
        <button class="btn btn-primary" onclick="viewPaper('${escapeHtml(paperId)}')">查看原文</button>
        <button class="btn-read" onclick="toggleReadStatus('${escapeHtml(paperId)}', this)" title="标记为已读">✓</button>
        <button class="btn-favorite" onclick="toggleFavoriteStatus('${escapeHtml(paperId)}', this)" title="添加到收藏">♡</button>
        <button class="btn btn-outline" onclick="showCustomTagsSelector('${escapeHtml(paperId)}')" title="添加自定义标签">标签</button>
    `;

    // 重新构建整个actionsDiv的内容
    actionsDiv.innerHTML = buttonsHTML + categoriesHTML + customTagsHTML;

    // 更新已读/收藏按钮状态
    const isRead = readPapers.includes(paperId);
    const isFavorite = favoritePapers.includes(paperId);

    const readButton = actionsDiv.querySelector('.btn-read');
    const favoriteButton = actionsDiv.querySelector('.btn-favorite');

    if (isRead) {
        readButton.classList.add('active');
    } else {
        readButton.classList.remove('active');
    }

    if (isFavorite) {
        favoriteButton.classList.add('active');
        favoriteButton.textContent = '♥';
    } else {
        favoriteButton.classList.remove('active');
        favoriteButton.textContent = '♡';
    }
}

// 简化 formatCategoriesWithCustom 函数
function formatCategoriesWithCustom(paper) {
    let categoriesHTML = formatCategories(paper.categories);

    // 获取该论文的自定义标签
    const customTagsForPaper = paperCustomTags[paper.paper_url] || [];

    // 使用更简单的标签样式
    // 使用内联样式确保颜色显示
    if (customTagsForPaper.length > 0) {
        const customTagsHTML = customTagsForPaper.map(tag =>
            `<span class="category-tag" style="background-color: #e8f5e9; color: #388e3c; border: 1px solid #c8e6c9; margin: 2px;">
                ${escapeHtml(tag)}            </span>`
        ).join('');
        categoriesHTML += customTagsHTML;
    }

    return categoriesHTML;
}


// function formatCategoriesWithCustom(paper) {
//     let categoriesHTML = formatCategories(paper.categories);
//
//     // 获取该论文的自定义标签
//     const customTagsForPaper = paperCustomTags[paper.paper_url] || [];
//
//     // 添加可删除的自定义标签显示
//     if (customTagsForPaper.length > 0) {
//         const customTagsHTML = customTagsForPaper.map(tag => `            <span class="custom-tag-wrapper" style="display: inline-block; position: relative; margin: 2px 4px;">
//                 <span class="custom-tag" style="
//                     display: inline-block;
//                     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                     color: white;
//                     padding: 4px 12px 4px 12px;
//                     border-radius: 20px;
//                     font-size: 12px;
//                     font-weight: 500;
//                     box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//                     transition: all 0.3s ease;
//                     cursor: pointer;
//                     position: relative;
//                 " onclick="toggleTagDeleteButton(this, '${escapeHtml(paper.paper_url)}', ${tag.id})"
//                    onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
//                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
//                     ${escapeHtml(tag.name)}                </span>
//                 <span class="delete-tag" style="
//                     display: none;
//                     position: absolute;
//                     top: -6px;
//                     right: -4px;
//                     background: #ff4757;
//                     color: white;
//                     width: 16px;
//                     height: 16px;
//                     border-radius: 50%;
//                     font-size: 10px;
//                     text-align: center;
//                     line-height: 16px;
//                     cursor: pointer;
//                     font-weight: bold;
//                 " onclick="deletePaperTag('${escapeHtml(paper.paper_url)}', ${tag.id}, '${escapeHtml(tag.name)}', event)">×</span>
//             </span>
//         `).join('');
//         categoriesHTML += customTagsHTML;
//     }
//
//     return categoriesHTML;
// }

// 渲染自定义标签树形结构
function renderCustomTagsTree(tags, container, level = 0) {
    const ul = document.createElement('ul');
    ul.style.paddingLeft = `${level * 20}px`;

    tags.forEach(tag => {
        const li = document.createElement('li');
        li.style.listStyle = 'none';
        li.style.margin = '5px 0';

        // 如果有子标签，显示为可展开的节点
        if (tag.children && tag.children.length > 0) {
            const expandBtn = document.createElement('span');
            expandBtn.textContent = '▶ ';
            expandBtn.style.cursor = 'pointer';
            expandBtn.style.userSelect = 'none';
            expandBtn.onclick = () => {
                const childrenContainer = li.querySelector('.children');
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    expandBtn.textContent = '▼ ';
                } else {
                    childrenContainer.style.display = 'none';
                    expandBtn.textContent = '▶ ';
                }
            };
            li.appendChild(expandBtn);
        }

        // 标签名称
        const tagSpan = document.createElement('span');
        tagSpan.textContent = tag.name;
        tagSpan.style.cursor = 'pointer';
        tagSpan.style.padding = '5px';
        tagSpan.style.borderRadius = '3px';
        tagSpan.onclick = () => applyCustomTag(tag.id, tag.name);
        tagSpan.onmouseover = () => tagSpan.style.backgroundColor = '#e6f0ff';
        tagSpan.onmouseout = () => tagSpan.style.backgroundColor = 'transparent';
        li.appendChild(tagSpan);

        // 子标签容器
        if (tag.children && tag.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            childrenContainer.style.display = 'none';
            childrenContainer.style.marginLeft = '20px';
            renderCustomTagsTree(tag.children, childrenContainer, level + 1);
            li.appendChild(childrenContainer);
        }

        ul.appendChild(li);
    });

    container.appendChild(ul);
}

async function showCustomTagsSelector(paperId) {
    // 如果还没有加载标签数据，则先加载
    if (customTags.length === 0) {
        await loadCustomTags();
    }

    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    modal.innerHTML = `        <div style="
            background: white;
            border-radius: 10px;
            padding: 20px;
            max-width: 500px;
            max-height: 80%;
            overflow-y: auto;
            position: relative;
        ">
            <h3 style="margin-top: 0; color: #333;">选择自定义标签</h3>
            <div id="customTagsTree" style="margin-bottom: 20px;"></div>
            <button class="btn btn-primary" onclick="this.closest('div').parentElement.remove()"
                style="position: sticky; bottom: 0; background: #2575fc; color: white;">
                关闭
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // 渲染标签树
    const treeContainer = modal.querySelector('#customTagsTree');
    renderCustomTagsTree(customTags, treeContainer);

    // 点击背景关闭模态框
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    // 保存当前论文ID，供应用标签时使用
    window.currentPaperId = paperId;
}

// 更新论文标签缓存
// async function updatePaperTagsCache(paperId, tagId, tagName) {
//     try {
//         // 从服务器重新获取该论文的标签
//         const tags = await loadPaperCustomTags(paperId);
//         paperCustomTags[paperId] = tags;
//     } catch (error) {
//         console.error('更新标签缓存失败:', error);
//         // 如果获取失败，手动添加到缓存
//         if (!paperCustomTags[paperId]) {
//             paperCustomTags[paperId] = [];
//         }
//
//         // 检查是否已存在该标签
//         const exists = paperCustomTags[paperId].some(tag => tag.id === tagId);
//         if (!exists) {
//             paperCustomTags[paperId].push({
//                 id: tagId,
//                 name: tagName
//             });
//         }
//     }
// }

// 修改 updatePaperTagsCache 函数，避免重新请求数据
async function updatePaperTagsCache(paperId, tagId, tagName) {
    // 直接操作本地缓存，而不是重新从服务器获取
    if (!paperCustomTags[paperId]) {
        paperCustomTags[paperId] = [];
    }

    // 检查是否已存在该标签
    const exists = paperCustomTags[paperId].some(tag => tag.id === tagId);
    if (!exists) {
        paperCustomTags[paperId].push({
            id: tagId,
            name: tagName
        });
    }
}

// 应用自定义标签到论文
// 应用自定义标签到论文
async function applyCustomTag(tagId, tagName) {
    if (!window.currentPaperId) {
        alert('未选择论文');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tags/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tag_id: tagId, paper_id: window.currentPaperId })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                alert(`成功为论文添加标签: ${tagName}`);

                // 更新本地缓存
                await updatePaperTagsCache(window.currentPaperId, tagId, tagName);

                // 立即更新界面显示
                updatePaperCardTagsDisplay(window.currentPaperId);

                // 关闭模态框
                const modal = document.querySelector('div[style*="position: fixed"][style*="z-index: 1000"]');
                if (modal) {
                    modal.remove();
                }
            } else {
                alert('添加标签失败: ' + (result.error || '未知错误'));
            }
        } else {
            alert('添加标签失败，请检查网络连接');
        }
    } catch (error) {
        console.error('应用自定义标签失败:', error);
        alert('添加标签失败: ' + error.message);
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

// 修改 filterPapers 函数，移除 preloadPaperTags 调用
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

        // 移除这行：await preloadPaperTags(papers);

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
        document.getElementById('papersContainer').innerHTML = `<div class="error">
                <h3>加载论文数据时出错</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
            </div>`;
    }
}

// 搜索和筛选功能
// async function filterPapers() {
//     const searchTerm = document.getElementById('searchInput').value;
//     const categoryFilter = document.getElementById('categoryFilter').value;
//     const dateFilter = document.getElementById('dateFilter').value;
//
//     try {
//         // 构建API参数
//         const params = {};
//         if (searchTerm) params.search = searchTerm;
//         if (categoryFilter) params.category = categoryFilter;
//
//         const papers = await fetchPapers(params);
//
//         // 预加载论文的自定义标签
//         // await preloadPaperTags(papers);
//
//         // 客户端日期筛选
//         let filteredPapers = papers;
//         if (dateFilter) {
//             filteredPapers = papers.filter(paper =>
//                 isWithinDays(paper.published, parseInt(dateFilter))
//             );
//         }
//
//         // 按日期降序排序（确保顺序正确）
//         filteredPapers.sort((a, b) => {
//             const dateA = new Date(a.published || 0);
//             const dateB = new Date(b.published || 0);
//             return dateB - dateA;
//         });
//
//         renderPapers(filteredPapers);
//     } catch (error) {
//         document.getElementById('papersContainer').innerHTML = `                    <div class="error">
//                 <h3>加载论文数据时出错</h3>
//                 <p>${error.message}</p>
//                 <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
//             </div>
//         `;
//     }
// }

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
// document.addEventListener('DOMContentLoaded', async () => {
//     await loadUserPreferences();
//     // 初始加载数据
//     filterPapers();
//
//     // 添加事件监听器
//     document.getElementById('searchInput').addEventListener('input', filterPapers);
//     document.getElementById('categoryFilter').addEventListener('change', filterPapers);
//     document.getElementById('dateFilter').addEventListener('change', filterPapers);
// });

// 在页面初始化时添加事件委托
document.addEventListener('DOMContentLoaded', async () => {
    // await loadUserPreferences();
    filterPapers();

    // 添加事件监听器
    document.getElementById('searchInput').addEventListener('input', filterPapers);
    document.getElementById('categoryFilter').addEventListener('change', filterPapers);
    document.getElementById('dateFilter').addEventListener('change', filterPapers);

    // 使用事件委托处理动态元素
    document.getElementById('papersContainer').addEventListener('click', function(e) {
        // 处理已读按钮点击
        if (e.target.classList.contains('btn-read')) {
            const paperId = e.target.closest('.paper-card').id.replace('paper-', '');
            toggleReadStatus(paperId, e.target);
        }

        // 处理收藏按钮点击
        if (e.target.classList.contains('btn-favorite')) {
            const paperId = e.target.closest('.paper-card').id.replace('paper-', '');
            toggleFavoriteStatus(paperId, e.target);
        }

        // 处理标签按钮点击
        if (e.target.classList.contains('btn-outline')) {
            const paperId = e.target.closest('.paper-card').id.replace('paper-', '');
            showCustomTagsSelector(paperId);
        }

        // 处理自定义标签点击
        if (e.target.classList.contains('simple-custom-tag')) {
            const paperId = e.target.dataset.paperId;
            const tagId = e.target.dataset.tagId;
            // 处理标签点击事件
        }
    });
});


