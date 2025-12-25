// ===== MODERN FILE MANAGER JAVASCRIPT =====

// Global state
const state = {
    bulkMode: false,
    selectedFiles: new Set(),
    clipboard: { mode: null, files: [] },
    currentPath: new URLSearchParams(window.location.search).get('path') || ''
};

// Load clipboard from localStorage on page load
if (localStorage.getItem('clipboard')) {
    try {
        state.clipboard = JSON.parse(localStorage.getItem('clipboard'));
    } catch (e) {
        console.error('Failed to load clipboard:', e);
    }
}

// ===== UTILITY FUNCTIONS =====
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function getCurrentPath() {
    const path = window.location.pathname;
    if (path.startsWith('/browse/')) {
        return path.substring(8); // Remove '/browse/'
    }
    return '';
}

// ===== MODAL =====
const modal = document.getElementById('modal');
const modalBox = document.getElementById('modalBox');

function showModal(content) {
    modalBox.innerHTML = content;
    modal.classList.add('active');
}

function hideModal() {
    modal.classList.remove('active');
}

// Click backdrop to close
document.querySelector('.modal-backdrop')?.addEventListener('click', hideModal);

// ===== DARK MODE =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// ===== FILE UPLOAD =====
let uploadQueue = [];

function initUpload() {
    // Upload button pickers
    document.querySelectorAll('[data-pick]').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.dataset.pick;
            document.getElementById(inputId)?.click();
        });
    });

    // File input listeners
    ['files', 'folder', 'cameraPhoto', 'cameraVideo'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(f => {
                if (!uploadQueue.find(item => item.name === f.name && item.size === f.size)) {
                    uploadQueue.push(f);
                }
            });
            updateQueue();
        });
    });
}

function updateQueue() {
    const queueEl = document.getElementById('queue');
    if (!queueEl) return;
    
    queueEl.innerHTML = uploadQueue.map((f, i) => `
        <div class="queue-item">
            📄 ${f.name} (${formatFileSize(f.size)})
            <button onclick="removeFromQueue(${i})" style="float:right;background:none;border:none;cursor:pointer">✕</button>
        </div>
    `).join('');
}

function removeFromQueue(index) {
    uploadQueue.splice(index, 1);
    updateQueue();
}

function upload() {
    if (uploadQueue.length === 0) {
        return showToast('No files selected');
    }

    const target = document.getElementById('target').value;
    const newfolder = document.getElementById('newfolder').value.trim();
    const dest = newfolder || target;

    const formData = new FormData();
    formData.append('target', dest);
    uploadQueue.forEach(f => formData.append('files', f));

    const prog = document.getElementById('prog');
    const bar = document.getElementById('bar');
    prog.style.display = 'block';

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            bar.style.width = percent + '%';
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            showToast('✅ Upload complete');
            uploadQueue = [];
            updateQueue();
            prog.style.display = 'none';
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('❌ Upload failed: ' + xhr.responseText);
        }
    });

    xhr.addEventListener('error', () => {
        showToast('❌ Upload error');
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// ===== LINKS MANAGEMENT =====
function loadLinks() {
    fetch('/links').then(r => r.json()).then(data => {
        const box = document.getElementById('linksBox');
        if (!box) return;
        
        if (data.length === 0) {
            box.innerHTML = '<p style="color:var(--text-secondary);font-size:14px">No links yet</p>';
            return;
        }
        
        box.innerHTML = data.map(l => `
            <div class="link-item" onclick="showLinkDetails('${l.id}')">
                <div style="font-weight:500">${l.name}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${l.url.substring(0, 50)}${l.url.length > 50 ? '...' : ''}</div>
            </div>
        `).join('');
    });
}

function addLink() {
    const nameField = document.getElementById('newLinkName');
    const urlField = document.getElementById('newLinkUrl');
    
    if (!nameField || !urlField) {
        return showToast('❌ Link fields not found');
    }
    
    const name = nameField.value.trim();
    const url = urlField.value.trim();
    
    if (!name || !url) {
        return showToast('⚠️ Please fill both fields');
    }
    
    fetch('/add-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `n=${encodeURIComponent(name)}&u=${encodeURIComponent(url)}`
    }).then(r => {
        if (r.ok) {
            showToast('✅ Link added');
            nameField.value = '';
            urlField.value = '';
            loadLinks();
        } else {
            r.text().then(msg => showToast('❌ ' + msg));
        }
    }).catch(err => {
        showToast('❌ Failed to add link');
        console.error(err);
    });
}

function showLinkDetails(id) {
    fetch('/links').then(r => r.json()).then(data => {
        const link = data.find(l => l.id === id);
        if (!link) return;
        
        showModal(`
            <h3>🔗 ${link.name}</h3>
            <p style="margin:10px 0;word-break:break-all">
                <strong>URL:</strong><br>
                <a href="${link.url}" target="_blank" style="color:var(--primary-color)">${link.url}</a>
            </p>
            <p style="font-size:13px;color:var(--text-secondary)">Created: ${link.created}</p>
            <div class="modal-actions">
                <button onclick="copyToClipboard('${link.url.replace(/'/g, "\\'")}')">📋 Copy URL</button>
                <button onclick="editLink('${id}', '${link.name.replace(/'/g, "\\'") }', '${link.url.replace(/'/g, "\\'")}')">✏️ Edit</button>
                <button onclick="deleteLink('${id}')">🗑 Delete</button>
                <button onclick="hideModal()">Close</button>
            </div>
        `);
    });
}

function editLink(id, name, url) {
    showModal(`
        <h3>✏️ Edit Link</h3>
        <input id="editLinkName" class="input-field" value="${name}" placeholder="Link name">
        <input id="editLinkUrl" class="input-field" value="${url}" placeholder="URL">
        <div class="modal-actions">
            <button onclick="saveEditLink('${id}')">💾 Save</button>
            <button onclick="hideModal()">Cancel</button>
        </div>
    `);
}

function saveEditLink(id) {
    const name = document.getElementById('editLinkName').value.trim();
    const url = document.getElementById('editLinkUrl').value.trim();
    
    if (!name || !url) return showToast('⚠️ Please fill both fields');
    
    fetch('/links/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, url })
    }).then(r => {
        if (r.ok) {
            showToast('✅ Link updated');
            hideModal();
            loadLinks();
        } else {
            r.text().then(msg => showToast('❌ ' + msg));
        }
    });
}

function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    
    fetch(`/delete-link/${id}`).then(r => {
        if (r.ok) {
            showToast('✅ Link deleted');
            hideModal();
            loadLinks();
        }
    });
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Copied to clipboard');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        showToast('📋 Copied to clipboard');
    } catch (err) {
        showToast('❌ Copy failed');
    }
    document.body.removeChild(ta);
}

// ===== FILE OPERATIONS =====
function createNewFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    const path = getCurrentPath();
    const fullPath = path ? `${path}/${name}` : name;
    
    fetch('/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath })
    }).then(r => {
        if (r.ok) {
            showToast('✅ Folder created');
            location.reload();
        } else {
            r.text().then(showToast);
        }
    });
}

function createNewFile() {
    const name = prompt('Enter filename (e.g., notes.txt):');
    if (!name) return;
    
    const currentPath = getCurrentPath();
    
    fetch('/create-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: name, folder: currentPath })
    }).then(r => {
        if (r.ok) {
            showToast('✅ File created');
            location.reload();
        } else {
            r.text().then(showToast);
        }
    });
}

// ===== BULK SELECTION =====
function toggleBulkMode() {
    state.bulkMode = !state.bulkMode;
    const checkboxes = document.querySelectorAll('.row-checkbox');
    const bulkBar = document.getElementById('bulkBar');
    
    checkboxes.forEach(cb => {
        cb.style.display = state.bulkMode ? 'block' : 'none';
    });
    
    bulkBar.style.display = state.bulkMode ? 'flex' : 'none';
    
    if (!state.bulkMode) {
        state.selectedFiles.clear();
        checkboxes.forEach(cb => cb.checked = false);
        document.querySelectorAll('.file-row').forEach(row => row.classList.remove('selected'));
        updateBulkCount();
    }
}

function updateBulkCount() {
    const countEl = document.getElementById('bulkCount');
    if (countEl) {
        countEl.textContent = `${state.selectedFiles.size} selected`;
    }
}

function bulkCopy() {
    if (state.selectedFiles.size === 0) {
        return showToast('⚠️ No files selected');
    }
    state.clipboard = { mode: 'copy', files: Array.from(state.selectedFiles) };
    localStorage.setItem('clipboard', JSON.stringify(state.clipboard));
    showToast(`📋 Copied ${state.clipboard.files.length} item(s)`);
    updateClipboardBtn();
}

function bulkCut() {
    if (state.selectedFiles.size === 0) {
        return showToast('No files selected');
    }
    state.clipboard = { mode: 'cut', files: Array.from(state.selectedFiles) };
    localStorage.setItem('clipboard', JSON.stringify(state.clipboard));
    showToast(`✂️ Cut ${state.clipboard.files.length} items! Navigate to folder, click "Paste Here" 👆`, 5000);
    updateClipboardBtn();
}

function bulkPaste() {
    if (state.clipboard.files.length === 0) {
        return showToast('📋 Clipboard is empty');
    }
    
    const destFolder = getCurrentPath();
    const mode = state.clipboard.mode;
    
    console.log('Pasting:', { mode, files: state.clipboard.files, dest: destFolder });
    
    if (mode === 'cut') {
        Promise.all(state.clipboard.files.map(f =>
            fetch('/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `source=${encodeURIComponent(f)}&dest=${encodeURIComponent(destFolder)}`
            }).then(r => {
                if (!r.ok) {
                    return r.text().then(msg => { throw new Error(msg); });
                }
                return r;
            })
        )).then(() => {
            showToast('✅ Files moved successfully');
            state.clipboard = { mode: null, files: [] };
            localStorage.removeItem('clipboard');
            updateClipboardBtn();
            setTimeout(() => location.reload(), 500);
        }).catch(err => {
            showToast('❌ Move failed: ' + err.message);
            console.error('Move error:', err);
        });
    } else if (mode === 'copy') {
        Promise.all(state.clipboard.files.map(f =>
            fetch('/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `source=${encodeURIComponent(f)}&dest=${encodeURIComponent(destFolder)}`
            }).then(r => {
                if (!r.ok) {
                    return r.text().then(msg => { throw new Error(msg); });
                }
                return r;
            })
        )).then(() => {
            showToast('✅ Files copied successfully');
            setTimeout(() => location.reload(), 500);
        }).catch(err => {
            showToast('❌ Copy failed: ' + err.message);
            console.error('Copy error:', err);
        });
    }
}

function bulkDelete() {
    if (state.selectedFiles.size === 0) {
        return showToast('No files selected');
    }
    
    if (!confirm(`Delete ${state.selectedFiles.size} item(s)?`)) return;
    
    fetch('/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(state.selectedFiles) })
    }).then(r => {
        if (r.ok) {
            showToast('✅ Items deleted');
            location.reload();
        } else {
            r.text().then(showToast);
        }
    });
}

function cancelBulk() {
    toggleBulkMode();
}

function updateClipboardBtn() {
    const btn = document.querySelector('[data-action="clipboard"]');
    const countEl = document.getElementById('clipCount');
    if (btn && countEl) {
        btn.style.display = state.clipboard.files.length > 0 ? 'flex' : 'none';
        countEl.textContent = state.clipboard.files.length;
    }
    
    // Show paste button in breadcrumb
    const pasteBtn = document.querySelector('[data-action="paste-here"]');
    if (pasteBtn) {
        if (state.clipboard.files.length > 0) {
            const mode = state.clipboard.mode === 'cut' ? '✂️ Cut' : '📋 Copied';
            pasteBtn.innerHTML = `📌 Paste Here (${state.clipboard.files.length} ${mode}) <span style="margin-left:8px;padding:4px 8px;background:rgba(255,255,255,0.2);border-radius:4px;cursor:pointer" onclick="event.stopPropagation(); clearClipboard()">✕ Cancel</span>`;
            pasteBtn.style.display = 'block';
        } else {
            pasteBtn.style.display = 'none';
        }
    }
}

function clearClipboard() {
    state.clipboard = { mode: null, files: [] };
    localStorage.removeItem('clipboard');
    updateClipboardBtn();
    showToast('🗑️ Clipboard cleared');
}

// ===== FILE LIST INTERACTIONS =====
function handleFileRowClick(row) {
    if (state.bulkMode) {
        const checkbox = row.querySelector('.row-checkbox');
        checkbox.checked = !checkbox.checked;
        handleCheckboxChange(checkbox, row);
    } else {
        const path = row.dataset.path;
        const isDir = row.dataset.isdir === 'true';
        
        if (isDir) {
            window.location.href = `/browse/${path}`;
        } else {
            // Check if it's previewable
            const filename = path.toLowerCase();
            if (filename.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
                showPreview(path, 'image');
            } else if (filename.match(/\.(mp4|mkv|avi|mov|webm)$/)) {
                showPreview(path, 'video');
            } else if (filename.match(/\.(mp3|wav|m4a|flac|ogg)$/)) {
                showPreview(path, 'audio');
            } else {
                window.open(`/files/${path}`, '_blank');
            }
        }
    }
}

function handleCheckboxChange(checkbox, row) {
    const path = row.dataset.path;
    
    if (checkbox.checked) {
        state.selectedFiles.add(path);
        row.classList.add('selected');
    } else {
        state.selectedFiles.delete(path);
        row.classList.remove('selected');
    }
    
    updateBulkCount();
}

function showPreview(path, type) {
    let content = '';
    if (type === 'image') {
        content = `<img src="/files/${path}" style="max-width:100%;max-height:70vh;border-radius:8px">`;
    } else if (type === 'video') {
        content = `<video controls style="max-width:100%;max-height:70vh;border-radius:8px">
                    <source src="/files/${path}">
                   </video>`;
    } else if (type === 'audio') {
        content = `<audio controls style="width:100%">
                    <source src="/files/${path}">
                   </audio>`;
    }
    
    showModal(`
        <h3>${path.split('/').pop()}</h3>
        <div style="text-align:center;margin:20px 0">
            ${content}
        </div>
        <div class="modal-actions">
            <a href="/download/${path}" download><button>⬇ Download</button></a>
            <button onclick="hideModal()">Close</button>
        </div>
    `);
}

function showFileMenu(path, isDir) {
    const hasClipboard = state.clipboard.files.length > 0;
    const clipboardMode = state.clipboard.mode;
    const filename = path.toLowerCase();
    const isTextFile = filename.match(/\.(txt|md|json|js|py|c|cpp|h|hpp|java|cs|php|rb|go|rs|swift|kt|ts|tsx|jsx|html|css|xml|log|csv|yml|yaml|sh|bat|ps1|sql|r|m|matlab|scala|perl|lua|vim|ini|cfg|conf|toml)$/);
    
    const menuItems = [
        !isDir && !isTextFile ? `<div class="context-item" onclick="previewFileFromMenu('${path}')">👁 Preview</div>` : '',
        !isDir && isTextFile ? `<div class="context-item" onclick="editTextFile('${path}'); hideModal()">✏️ Edit</div>` : '',
        `<div class="context-item" onclick="renameFile('${path}'); hideModal()">✏️ Rename</div>`,
        `<div class="context-item" onclick="moveFile('${path}')">📦 Move</div>`,
        `<div class="context-item" onclick="copyFile('${path}')">📋 Copy</div>`,
        `<div class="context-item" onclick="cutFile('${path}')">✂️ Cut</div>`,
        hasClipboard ? `<div class="context-item" onclick="bulkPaste(); hideModal()">📌 Paste (${state.clipboard.files.length} ${clipboardMode === 'cut' ? 'cut' : 'copied'})</div>` : '',
        '<div class="context-sep"></div>',
        `<div class="context-item" onclick="downloadFile('${path}')">⬇️ Download</div>`,
        `<div class="context-item" onclick="showDetails('${path}')">ℹ️ Details</div>`,
        '<div class="context-sep"></div>',
        `<div class="context-item danger" onclick="deleteFile('${path}'); hideModal()">🗑 Delete</div>`
    ];
    
    showModal(`
        <div style="display:flex;flex-direction:column;gap:10px">
            ${menuItems.filter(Boolean).join('')}
        </div>
    `);
}

function editTextFile(path) {
    fetch('/read-text/' + path).then(r => r.json()).then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        showModal(`
            <h3>✏️ Edit: ${data.name}</h3>
            <div class="code-editor-wrapper">
                <div class="line-numbers" id="lineNumbers"></div>
                <textarea id="textEditor" class="code-editor" spellcheck="false">${data.content}</textarea>
            </div>
            <div class="modal-actions">
                <button onclick="saveTextFile('${path}')">💾 Save</button>
                <button onclick="hideModal()">Cancel</button>
            </div>
        `);
        updateLineNumbers();
        document.getElementById('textEditor').addEventListener('input', updateLineNumbers);
        document.getElementById('textEditor').addEventListener('scroll', syncScroll);
    });
}

function updateLineNumbers() {
    const textarea = document.getElementById('textEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (!textarea || !lineNumbers) return;
    
    const lines = textarea.value.split('\n').length;
    const numbers = Array.from({length: lines}, (_, i) => i + 1).join('\n');
    lineNumbers.textContent = numbers;
}

function syncScroll() {
    const textarea = document.getElementById('textEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (lineNumbers && textarea) {
        lineNumbers.scrollTop = textarea.scrollTop;
    }
}

function saveTextFile(path) {
    const content = document.getElementById('textEditor').value;
    fetch('/save-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
    }).then(r => {
        if (r.ok) {
            showToast('💾 File saved');
            hideModal();
        } else {
            r.text().then(msg => showToast('❌ ' + msg));
        }
    });
}

function previewFileFromMenu(path) {
    hideModal();
    const filename = path.toLowerCase();
    if (filename.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
        showPreview(path, 'image');
    } else if (filename.match(/\.(mp4|mkv|avi|mov|webm)$/)) {
        showPreview(path, 'video');
    } else if (filename.match(/\.(mp3|wav|m4a|flac|ogg)$/)) {
        showPreview(path, 'audio');
    } else {
        window.open(`/files/${path}`, '_blank');
    }
}

function copyFile(path) {
    state.clipboard = { mode: 'copy', files: [path] };
    localStorage.setItem('clipboard', JSON.stringify(state.clipboard));
    showToast('📋 Copied! Navigate to folder, then click "Paste Here" 👆', 5000);
    updateClipboardBtn();
    hideModal();
}

function cutFile(path) {
    state.clipboard = { mode: 'cut', files: [path] };
    localStorage.setItem('clipboard', JSON.stringify(state.clipboard));
    showToast('✂️ Cut! Navigate to folder, then click "Paste Here" 👆', 5000);
    updateClipboardBtn();
    hideModal();
}

function renameFile(path) {
    const oldName = path.split('/').pop();
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;
    
    fetch('/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `old=${encodeURIComponent(path)}&new=${encodeURIComponent(newName)}`
    }).then(r => {
        if (r.ok) {
            showToast('✅ Renamed');
            location.reload();
        } else {
            r.text().then(showToast);
        }
    });
}

function moveFile(path) {
    // Get list of all folders from DOM
    const allRows = document.querySelectorAll('.file-row');
    const folders = Array.from(allRows)
        .filter(row => row.dataset.isdir === 'true')
        .map(row => {
            const nameEl = row.querySelector('.file-name');
            return { 
                path: row.dataset.path, 
                name: nameEl ? nameEl.textContent.trim() : row.dataset.path
            };
        });
    
    const currentPath = getCurrentPath();
    const currentFolder = currentPath ? currentPath.split('/').pop() : 'Root';
    
    let folderOptions = `<option value="" ${!currentPath ? 'selected' : ''}>🏠 Root (Home)</option>`;
    
    if (currentPath) {
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        folderOptions += `<option value="${parentPath}">⬆️ Up to Parent</option>`;
    }
    
    folders.forEach(f => {
        if (f.path !== path) { // Don't show the file being moved
            folderOptions += `<option value="${f.path}">📁 ${f.name}</option>`;
        }
    });
    
    showModal(`
        <h3>📦 Move File</h3>
        <p style="margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">
            <strong>📋 Moving:</strong> ${path.split('/').pop()}<br>
            <strong>📂 Current location:</strong> ${currentFolder}
        </p>
        <label style="display:block;margin-bottom:8px;font-weight:500">Choose destination:</label>
        <select id="moveDestSelect" class="input-field" style="width:100%;margin-bottom:16px;padding:10px">
            ${folderOptions}
        </select>
        <div class="modal-actions">
            <button onclick="confirmMove('${path}')">✅ Move Here</button>
            <button onclick="hideModal()">❌ Cancel</button>
        </div>
    `);
}

function confirmMove(path) {
    const selectEl = document.getElementById('moveDestSelect');
    if (!selectEl) {
        showToast('❌ Move cancelled');
        return;
    }
    
    const dest = selectEl.value;
    
    fetch('/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `source=${encodeURIComponent(path)}&dest=${encodeURIComponent(dest)}`
    }).then(r => {
        if (r.ok) {
            showToast('✅ Moved successfully');
            hideModal();
            setTimeout(() => location.reload(), 500);
        } else {
            r.text().then(msg => showToast('❌ ' + msg));
        }
    }).catch(err => {
        showToast('❌ Move failed');
        console.error(err);
    });
}

function downloadFile(path) {
    window.location.href = `/download/${path}`;
    hideModal();
}

function deleteFile(path) {
    if (!confirm('Delete this item?')) return;
    
    window.location.href = `/delete/${path}`;
}

function showDetails(path) {
    fetch(`/details/${path}`).then(r => r.json()).then(d => {
        showModal(`
            <h3>${d.name}</h3>
            <p><strong>Type:</strong> ${d.type}</p>
            <p><strong>Size:</strong> ${d.size}</p>
            ${d.files !== undefined ? `<p><strong>Files:</strong> ${d.files}</p>` : ''}
            ${d.folders !== undefined ? `<p><strong>Folders:</strong> ${d.folders}</p>` : ''}
            <p><strong>Created:</strong> ${d.ctime}</p>
            <p><strong>Modified:</strong> ${d.mtime}</p>
            <div class="modal-actions">
                <button onclick="hideModal()">Close</button>
            </div>
        `);
    });
}

// ===== SEARCH & FILTER =====
function initFilters() {
    const search = document.getElementById('search');
    const filter = document.getElementById('filter');
    const sort = document.getElementById('sort');
    
    if (search) search.addEventListener('input', applyFilters);
    if (filter) filter.addEventListener('change', applyFilters);
    if (sort) sort.addEventListener('change', applyFilters);
}

function applyFilters() {
    const search = document.getElementById('search');
    const filter = document.getElementById('filter');
    const sort = document.getElementById('sort');
    
    if (!search || !filter || !sort) return;
    
    const query = search.value.toLowerCase();
    const typeFilter = filter.value;
    const sortMethod = sort.value;
    
    const rows = Array.from(document.querySelectorAll('.file-row'));
    const list = document.getElementById('list');
    
    // Filter
    rows.forEach(row => {
        const name = row.dataset.name || '';
        const type = row.dataset.type || '';
        
        const matchesSearch = name.includes(query);
        const matchesType = typeFilter === 'all' || type === typeFilter;
        
        row.style.display = (matchesSearch && matchesType) ? 'flex' : 'none';
    });
    
    // Sort
    const visibleRows = rows.filter(r => r.style.display !== 'none');
    
    visibleRows.sort((a, b) => {
        const nameA = a.dataset.name || '';
        const nameB = b.dataset.name || '';
        const isDirA = a.dataset.isdir === 'true';
        const isDirB = b.dataset.isdir === 'true';
        const mtimeA = parseFloat(a.dataset.mtime) || 0;
        const mtimeB = parseFloat(b.dataset.mtime) || 0;
        const sizeA = parseFloat(a.dataset.size) || 0;
        const sizeB = parseFloat(b.dataset.size) || 0;
        
        // Folders always first
        if (isDirA !== isDirB) return isDirA ? -1 : 1;
        
        switch (sortMethod) {
            case 'name-asc': return nameA.localeCompare(nameB);
            case 'name-desc': return nameB.localeCompare(nameA);
            case 'date-new': return mtimeB - mtimeA;
            case 'date-old': return mtimeA - mtimeB;
            case 'size-large': return sizeB - sizeA;
            case 'size-small': return sizeA - sizeB;
            default: return 0;
        }
    });
    
    visibleRows.forEach(row => list.appendChild(row));
}

// ===== STORAGE STATS =====
function loadStats() {
    fetch('/storage-stats').then(r => r.json()).then(data => {
        document.getElementById('statFiles').textContent = data.file_count;
        document.getElementById('statFolders').textContent = data.folder_count;
        document.getElementById('statSize').textContent = data.total_size;
    });
}

function toggleStats() {
    const panel = document.getElementById('statsPanel');
    if (panel.style.display === 'none') {
        loadStats();
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

// ===== EVENT DELEGATION =====
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    console.log('Action clicked:', action);
    
    const actions = {
        'dark-mode': toggleDarkMode,
        'upload': () => document.getElementById('uploadPanel').style.display = 'block',
        'new-folder': createNewFolder,
        'new-file': createNewFile,
        'select-mode': toggleBulkMode,
        'clipboard': () => showToast(`${state.clipboard.files.length} items in clipboard`),
        'stats': toggleStats,
        'links': () => {
            const panel = document.getElementById('linksPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            if (panel.style.display === 'block') loadLinks();
        },
        'paste-here': bulkPaste,
        'start-upload': upload,
        'add-link': addLink,
        'bulk-copy': bulkCopy,
        'bulk-cut': bulkCut,
        'bulk-paste': bulkPaste,
        'bulk-delete': bulkDelete,
        'cancel-bulk': cancelBulk,
        'file-menu': () => {
            const row = e.target.closest('.file-row');
            if (row) {
                const path = row.dataset.path;
                const isDir = row.dataset.isdir === 'true';
                showFileMenu(path, isDir);
            }
        }
    };
    
    if (actions[action]) {
        e.preventDefault();
        actions[action]();
    }
});

// Close buttons
document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
        const panelId = closeBtn.dataset.close;
        document.getElementById(panelId).style.display = 'none';
    }
});

// File row clicks
document.addEventListener('click', (e) => {
    const row = e.target.closest('.file-row');
    if (!row) return;
    
    // Ignore clicks on action buttons or checkboxes
    if (e.target.closest('.file-actions') || e.target.closest('.row-checkbox')) return;
    
    // Don't clear clipboard state when clicking files
    handleFileRowClick(row);
});

// Checkbox changes
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-checkbox')) {
        const row = e.target.closest('.file-row');
        handleCheckboxChange(e.target, row);
    }
});

// Breadcrumb navigation
document.addEventListener('click', (e) => {
    const crumb = e.target.closest('.crumb');
    if (crumb) {
        const path = crumb.dataset.path;
        window.location.href = path ? `/browse/${path}` : '/';
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initFilters();
    updateClipboardBtn();
});
