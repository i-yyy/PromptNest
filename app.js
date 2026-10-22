(() => {
  const KEY = 'ci-xia-prompts-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { prompts: [], categories: [], view: 'all', category: '', query: '', sort: 'updated', importData: null, importCategories: [] };
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value));
  const save = () => { state.categories = [...new Set([...state.categories, ...state.prompts.map(p => p.category).filter(Boolean)])]; localStorage.setItem(KEY, JSON.stringify(state.prompts)); localStorage.setItem(`${KEY}-categories`, JSON.stringify(state.categories)); render(); };
  const showToast = message => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300); };
  const parseTags = value => value.split(/[,，、]/).map(tag => tag.trim()).filter(Boolean).filter((tag, i, all) => all.indexOf(tag) === i);
  const folderDepth = path => path.split(' / ').length - 1;
  const promptIsInside = (prompt, path) => prompt.category === path || prompt.category.startsWith(`${path} / `);
  const createFolder = (parent = '') => {
    const name = window.prompt(parent ? `在「${parent}」中创建子文件夹` : '输入新文件夹名称');
    if (!name?.trim()) return;
    const cleanName = name.trim();
    if (cleanName.includes('/')) { showToast('文件夹名称不能包含 /'); return; }
    const path = parent ? `${parent} / ${cleanName}` : cleanName;
    if (state.categories.includes(path)) { showToast('这个文件夹已经存在'); return; }
    state.categories.push(path); state.view = 'all'; state.category = path; save(); showToast('文件夹已创建');
  };
  const variablesIn = content => [...new Set([...content.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(match => match[1].trim()).filter(Boolean))];
  const seed = [
    { id: crypto.randomUUID(), title: '把复杂概念讲给初学者', content: '请把「{{概念}}」解释给刚接触这个领域的{{读者}}。\n\n要求：\n- 先用一句话概括\n- 用一个生活中的例子说明\n- 解释最容易混淆的地方\n- 最后给出 3 个可以继续探索的问题', category: '学习', tags: ['解释', '入门', '学习'], description: '把专业知识转成清晰易懂的讲解。', model: '通用', favorite: true, archived: false, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 1.2 },
    { id: crypto.randomUUID(), title: '小红书种草笔记', content: '你是一位真实、细腻的生活方式博主。请根据以下信息写一篇小红书笔记：\n\n产品/体验：{{产品或体验}}\n目标读者：{{目标读者}}\n最想表达的感受：{{核心感受}}\n\n语气自然、有具体细节，不要堆砌形容词。包含一个吸引人的标题、正文和 3-5 个相关话题标签。', category: '写作', tags: ['小红书', '文案', '种草'], description: '用于分享产品体验或生活方式内容。', model: '通用', favorite: true, archived: false, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
    { id: crypto.randomUUID(), title: '会议纪要整理', content: '请将以下会议记录整理成清晰的纪要：\n\n{{会议记录}}\n\n请按以下结构输出：\n1. 会议结论\n2. 讨论要点\n3. 待办事项（负责人、截止时间）\n4. 尚未解决的问题\n\n忠于原始记录；没有提到的信息请标注「待确认」，不要自行补充。', category: '工作', tags: ['会议', '总结', '效率'], description: '从零散讨论中提取结论和行动项。', model: '通用', favorite: false, archived: false, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
    { id: crypto.randomUUID(), title: '代码审查清单', content: '请审查下面的{{语言}}代码，优先关注正确性、安全性和可维护性。\n\n```\n{{代码}}\n```\n\n按以下格式输出：\n- 问题：说明具体位置和影响\n- 建议：给出可执行的修改方式\n- 不确定项：标明需要作者确认的假设\n\n只指出有实际影响的问题；如果没有发现问题，请明确说明。', category: '编程', tags: ['代码审查', '开发', '质量'], description: '审查代码时聚焦高影响问题并给出改进建议。', model: '通用', favorite: false, archived: false, createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 3 }
  ];

  try { state.prompts = JSON.parse(localStorage.getItem(KEY) || 'null') || seed; state.categories = JSON.parse(localStorage.getItem(`${KEY}-categories`) || 'null') || [...new Set(state.prompts.map(p => p.category).filter(Boolean))]; localStorage.setItem(KEY, JSON.stringify(state.prompts)); localStorage.setItem(`${KEY}-categories`, JSON.stringify(state.categories)); }
  catch { state.prompts = seed; }

  const visiblePrompts = () => {
    let items = state.prompts.filter(prompt => state.view === 'archive' ? prompt.archived : !prompt.archived);
    if (state.view === 'favorite') items = items.filter(prompt => prompt.favorite);
    if (state.category) items = items.filter(prompt => promptIsInside(prompt, state.category));
    if (state.query) {
      const q = state.query.toLocaleLowerCase();
      items = items.filter(p => [p.title, p.content, p.description, p.category, p.model, ...(p.tags || [])].join(' ').toLocaleLowerCase().includes(q));
    }
    if (state.view === 'recent') items.sort((a, b) => b.updatedAt - a.updatedAt);
    else if (state.sort === 'title') items.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    else if (state.sort === 'favorite') items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
    else items.sort((a, b) => b.updatedAt - a.updatedAt);
    return items;
  };
  const render = () => {
    const categoryPaths = [...new Set([...state.categories, ...state.prompts.filter(p => !p.archived).map(p => p.category).filter(Boolean)])];
    categoryPaths.forEach(path => { const parts = path.split(' / '); for (let i = 1; i < parts.length; i++) categoryPaths.push(parts.slice(0, i).join(' / ')); });
    const categories = [...new Set(categoryPaths)].sort((a,b) => a.localeCompare(b, 'zh-CN'));
    $('#category-list').innerHTML = categories.map(cat => {
      const label = cat.split(' / ').at(-1); const total = state.prompts.filter(p => !p.archived && promptIsInside(p, cat)).length;
      return `<div class="category-row" style="--folder-depth:${folderDepth(cat)}"><button class="category-item ${state.category === cat ? 'selected' : ''}" data-category="${esc(cat)}" title="${esc(cat)}"><span class="category-dot"></span><span class="category-name">${esc(label)}</span><span class="category-total">${total}</span></button><button class="category-child-create" data-add-subcategory="${esc(cat)}" title="在 ${esc(cat)} 中新建子文件夹" aria-label="在 ${esc(cat)} 中新建子文件夹">＋</button></div>`;
    }).join('') || '<p class="category-empty">保存提示词后自动整理</p>';
    $('#category-options').innerHTML = categories.map(cat => `<option value="${esc(cat)}"></option>`).join('');
    $('#all-count').textContent = state.prompts.filter(p => !p.archived).length;
    $('#favorite-count').textContent = state.prompts.filter(p => !p.archived && p.favorite).length;
    const viewNames = { all: '全部提示词', favorite: '我的收藏', recent: '最近更新', archive: '已归档' };
    const title = state.category || viewNames[state.view];
    $('#view-title').textContent = title; $('#heading-title').childNodes[0].textContent = title + ' ';
    const items = visiblePrompts(); $('#heading-count').textContent = items.length;
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === state.view && !state.category));
    const grid = $('#prompt-grid');
    grid.innerHTML = items.map((p, index) => `<article class="prompt-card" style="--card-index:${index}" data-id="${esc(p.id)}"><div class="card-top"><span class="card-category"><i></i>${esc(p.category || '未分类')}</span><button class="favorite-button ${p.favorite ? 'is-favorite' : ''}" data-favorite="${esc(p.id)}" title="${p.favorite ? '取消收藏' : '加入收藏'}">${p.favorite ? '★' : '☆'}</button></div><button class="card-main" data-detail="${esc(p.id)}"><h3>${esc(p.title)}</h3><p class="card-description">${esc(p.description || p.content.replace(/\s+/g, ' '))}</p><div class="card-preview">${esc(p.content.slice(0, 190))}${p.content.length > 190 ? '…' : ''}</div></button><div class="card-tags">${(p.tags || []).slice(0, 3).map(tag => `<span class="tag"># ${esc(tag)}</span>`).join('')}${(p.tags || []).length > 3 ? `<span class="tag-more">+${p.tags.length - 3}</span>` : ''}</div><div class="card-footer"><span>${p.model ? `<span class="model-dot">✳</span> ${esc(p.model)}` : '<span>提示词'}</span><span>${date(p.updatedAt)}</span></div><div class="card-hover-actions"><button data-use="${esc(p.id)}">使用 ↗</button><button data-edit="${esc(p.id)}">编辑</button></div></article>`).join('');
    const empty = items.length === 0; $('#empty-state').hidden = !empty; grid.hidden = empty;
    if (empty) {
      const filtered = state.query || state.category || ['favorite','archive'].includes(state.view);
      $('#empty-title').textContent = filtered ? '没有找到匹配的提示词' : '你的提示词库还是空的';
      $('#empty-copy').textContent = filtered ? '试试调整搜索词或筛选条件。' : '把那些好用的提示词收进来，下次就不用再找一遍。';
      $('.empty-state .new-prompt').hidden = filtered;
    }
    const filterChips = [];
    if (state.category) filterChips.push(`<button data-clear-category>分类：${esc(state.category)} <span>×</span></button>`);
    if (state.query) filterChips.push(`<button data-clear-search>搜索：${esc(state.query)} <span>×</span></button>`);
    $('#active-filters').innerHTML = filterChips.join('');
  };
  const openEdit = prompt => {
    $('#prompt-form').reset(); $('#prompt-id').value = prompt?.id || ''; $('#prompt-dialog-title').textContent = prompt ? '编辑提示词' : '新建提示词';
    $('#prompt-title').value = prompt?.title || ''; $('#prompt-content').value = prompt?.content || '';
    $('#prompt-category').value = prompt?.category || ''; $('#prompt-model').value = prompt?.model || '';
    $('#prompt-tags').value = (prompt?.tags || []).join(', '); $('#prompt-description').value = prompt?.description || '';
    $('#prompt-dialog').showModal(); $('#prompt-title').focus();
  };
  const openUse = id => {
    const prompt = state.prompts.find(p => p.id === id); if (!prompt) return;
    $('#use-title').textContent = prompt.title;
    const vars = variablesIn(prompt.content);
    $('#variable-fields').innerHTML = vars.length ? vars.map((name, i) => `<label class="field"><span>${esc(name)}</span><textarea data-variable="${esc(name)}" rows="${name.length > 12 ? 2 : 1}" placeholder="填写${esc(name)}…"></textarea></label>`).join('') : '<p class="no-variables">这条提示词没有变量，可以直接复制。</p>';
    $('#prompt-preview').value = prompt.content.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, '［$1］');
    $$('#variable-fields [data-variable]').forEach(field => field.addEventListener('input', updatePreview));
    $('#copy-generated').dataset.id = id; $('#use-dialog').showModal();
    const first = $('#variable-fields [data-variable]'); if (first) first.focus();
  };
  const updatePreview = () => {
    const prompt = state.prompts.find(p => p.id === $('#copy-generated').dataset.id); if (!prompt) return;
    const values = Object.fromEntries($$('#variable-fields [data-variable]').map(field => [field.dataset.variable, field.value]));
    $('#prompt-preview').value = prompt.content.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, name) => values[name.trim()] || `［${name.trim()}］`);
  };
  const copyText = async (text, promptId) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
    const prompt = state.prompts.find(p => p.id === promptId); if (prompt) { prompt.lastUsedAt = Date.now(); prompt.updatedAt = Date.now(); save(); }
    showToast('已复制到剪贴板');
  };
  const openDetail = id => {
    const p = state.prompts.find(item => item.id === id); if (!p) return;
    $('#detail-content').innerHTML = `<div class="modal-head"><div><p class="eyebrow">${esc(p.category || '未分类')}　·　更新于 ${date(p.updatedAt)}</p><h2>${esc(p.title)}</h2></div><button type="button" class="icon-button close-dialog" aria-label="关闭">×</button></div><p class="detail-description">${esc(p.description || '')}</p><div class="detail-meta">${p.model ? `<span class="detail-model">✳ ${esc(p.model)}</span>` : ''}${(p.tags || []).map(t => `<span class="tag"># ${esc(t)}</span>`).join('')}</div><pre class="detail-content">${esc(p.content)}</pre><div class="detail-actions"><button class="danger-button" data-delete="${esc(p.id)}">删除</button><button class="secondary-button" data-edit="${esc(p.id)}">编辑</button><button class="secondary-button" data-archive="${esc(p.id)}">${p.archived ? '取消归档' : '归档'}</button><button class="primary-button" data-use="${esc(p.id)}">使用提示词 ↗</button></div>`;
    $('#detail-dialog').showModal();
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('button, [data-detail]'); if (!target) return;
    if (target.matches('.new-prompt')) openEdit();
    else if (target.matches('.nav-item')) { state.view = target.dataset.view; state.category = ''; render(); }
    else if (target.dataset.addSubcategory !== undefined) createFolder(target.dataset.addSubcategory);
    else if (target.dataset.category) { state.view = 'all'; state.category = state.category === target.dataset.category ? '' : target.dataset.category; render(); }
    else if (target.dataset.clearCategory !== undefined) { state.category = ''; render(); }
    else if (target.dataset.clearSearch !== undefined) { state.query = ''; $('#search').value = ''; render(); }
    else if (target.matches('.close-dialog')) target.closest('dialog').close();
    else if (target.id === 'open-backup') $('#backup-dialog').showModal();
    else if (target.id === 'add-category') createFolder();
  });
  $$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $('#prompt-form').addEventListener('submit', event => {
    event.preventDefault(); const id = $('#prompt-id').value; const previous = state.prompts.find(p => p.id === id); const now = Date.now();
    const prompt = { id: id || crypto.randomUUID(), title: $('#prompt-title').value.trim(), content: $('#prompt-content').value.trim(), category: $('#prompt-category').value.trim(), model: $('#prompt-model').value.trim(), tags: parseTags($('#prompt-tags').value), description: $('#prompt-description').value.trim(), favorite: previous?.favorite || false, archived: previous?.archived || false, createdAt: previous?.createdAt || now, updatedAt: now, lastUsedAt: previous?.lastUsedAt || null };
    state.prompts = previous ? state.prompts.map(p => p.id === id ? prompt : p) : [prompt, ...state.prompts];
    $('#prompt-dialog').close(); save(); showToast(previous ? '提示词已更新' : '提示词已保存');
  });
  $('#prompt-content').addEventListener('input', () => { const vars = variablesIn($('#prompt-content').value); $('#variable-hint').textContent = vars.length ? `已识别 ${vars.length} 个变量：${vars.join('、')}` : '输入 {{变量名}}，使用时会自动生成填写项'; });
  $('#search').addEventListener('input', event => { state.query = event.target.value.trim(); render(); });
  $('#sort').addEventListener('change', event => { state.sort = event.target.value; render(); });
  $('#copy-generated').addEventListener('click', () => copyText($('#prompt-preview').value, $('#copy-generated').dataset.id));
  $('#prompt-grid').addEventListener('click', event => {
    const card = event.target.closest('.prompt-card'); if (!card) return;
    if (event.target.closest('[data-use]')) openUse(card.dataset.id);
    else if (event.target.closest('[data-edit]')) openEdit(state.prompts.find(p => p.id === card.dataset.id));
    else if (event.target.closest('[data-favorite]')) { const p = state.prompts.find(x => x.id === card.dataset.id); p.favorite = !p.favorite; p.updatedAt = Date.now(); save(); }
    else if (event.target.closest('[data-detail]')) openDetail(card.dataset.id);
  });
  $('#detail-content').addEventListener('click', event => {
    const target = event.target.closest('[data-use], [data-edit], [data-archive], [data-delete]'); if (!target) return;
    const id = target.dataset.use || target.dataset.edit || target.dataset.archive || target.dataset.delete;
    if (target.dataset.use) openUse(id);
    else if (target.dataset.edit) openEdit(state.prompts.find(p => p.id === id));
    else if (target.dataset.archive) { const p = state.prompts.find(x => x.id === id); p.archived = !p.archived; p.updatedAt = Date.now(); $('#detail-dialog').close(); save(); showToast(p.archived ? '已归档' : '已取消归档'); }
    else if (confirm('确定删除这条提示词吗？删除后无法恢复。')) { state.prompts = state.prompts.filter(p => p.id !== id); $('#detail-dialog').close(); save(); showToast('提示词已删除'); }
    if (!target.dataset.archive && !target.dataset.delete) $('#detail-dialog').close();
  });
  $('#export-data').addEventListener('click', () => {
    const backup = { format: 'ci-xia-prompt-library', version: 1, exportedAt: new Date().toISOString(), categories: state.categories, prompts: state.prompts };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `词匣备份-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('备份文件已下载');
  });
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text()); const prompts = Array.isArray(data) ? data : data.prompts;
      if (!Array.isArray(prompts) || prompts.some(p => !p || typeof p.title !== 'string' || typeof p.content !== 'string')) throw new Error('文件中没有有效的提示词数据');
      state.importData = prompts.map(p => ({ id: typeof p.id === 'string' ? p.id : crypto.randomUUID(), title: p.title.slice(0,100), content: p.content, category: typeof p.category === 'string' ? p.category : '', model: typeof p.model === 'string' ? p.model : (typeof p.model_hint === 'string' ? p.model_hint : ''), tags: Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string') : [], description: typeof p.description === 'string' ? p.description : '', favorite: Boolean(p.favorite ?? p.is_favorite), archived: Boolean(p.archived ?? p.is_archived), createdAt: Number(p.createdAt) || Number(p.created_at) || Date.now(), updatedAt: Number(p.updatedAt) || Number(p.updated_at) || Date.now(), lastUsedAt: Number(p.lastUsedAt) || null }));
      state.importCategories = Array.isArray(data.categories) ? data.categories.filter(c => typeof c === 'string') : [];
      const incomingIds = new Set(state.importData.map(p => p.id)); const existing = state.prompts.filter(p => incomingIds.has(p.id)).length;
      $('#import-preview').hidden = false; $('#import-preview').textContent = `文件中有 ${state.importData.length} 条提示词，其中 ${existing} 条与现有数据 ID 重合。`; $('#import-choice').hidden = false;
    } catch (error) { state.importData = null; $('#import-preview').hidden = false; $('#import-preview').textContent = `无法导入：${error.message}`; $('#import-choice').hidden = true; }
    event.target.value = '';
  });
  $('#merge-import').addEventListener('click', () => {
    if (!state.importData) return; const byId = new Map(state.prompts.map(p => [p.id,p])); state.importData.forEach(p => byId.set(p.id,p)); state.prompts = [...byId.values()]; state.categories = [...new Set([...state.categories, ...state.importCategories])]; save(); state.importData = null; state.importCategories = []; $('#import-preview').hidden = true; $('#import-choice').hidden = true; $('#backup-dialog').close(); showToast('数据已合并导入');
  });
  $('#replace-import').addEventListener('click', () => {
    if (!state.importData || !confirm(`将用文件中的 ${state.importData.length} 条提示词替换当前数据，继续吗？`)) return;
    state.prompts = state.importData; state.categories = state.importCategories; save(); state.importData = null; state.importCategories = []; $('#import-preview').hidden = true; $('#import-choice').hidden = true; $('#backup-dialog').close(); showToast('数据已替换');
  });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search').focus(); } });
  render();
})();
