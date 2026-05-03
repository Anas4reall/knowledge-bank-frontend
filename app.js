// --- Configuration ---
const API_URL = 'https://knowledge-bank-api.onrender.com/api';

// --- Data ---
const MAJORS = [
    { id: 'cs', name: 'علوم الحاسوب', short: 'CS', icon: 'monitor', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { id: 'it', name: 'تكنولوجيا المعلومات', short: 'IT', icon: 'server', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
    { id: 'cis', name: 'نظم معلومات حاسوبية', short: 'CIS', icon: 'book-open', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
    { id: 'sec', name: 'أمن سيبراني', short: 'Cyber', icon: 'shield', color: '#e11d48', bg: 'rgba(225,29,72,0.1)' }
];

const LEVELS = [
    { id: 1, name: 'المستوى الأول' },
    { id: 2, name: 'المستوى الثاني' },
    { id: 3, name: 'المستوى الثالث' },
    { id: 4, name: 'المستوى الرابع' }
];

// --- State ---
let currentState = {
    view: 'home', // 'home' | 'browser'
    selectedMajor: null,
    selectedLevel: null,
    searchQuery: '',
    files: [],
    user: null,
    token: null,
    authMode: 'login' // 'login' | 'register'
};

// --- DOM Elements ---
const homeView = document.getElementById('homeView');
const browserView = document.getElementById('browserView');
const mainSearchInput = document.getElementById('mainSearchInput');
const browserSearchInput = document.getElementById('browserSearchInput');
const majorsGrid = document.getElementById('majorsGrid');
const latestFilesGrid = document.getElementById('latestFilesGrid');
const browserFilesGrid = document.getElementById('browserFilesGrid');
const levelsTabs = document.getElementById('levelsTabs');
const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
const browserTitle = document.getElementById('browserTitle');
const emptyState = document.getElementById('emptyState');
const levelsTabsContainer = document.getElementById('levelsTabsContainer');

// Auth Elements
const loggedOutState = document.getElementById('loggedOutState');
const loggedInState = document.getElementById('loggedInState');
const openAuthBtn = document.getElementById('openAuthBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeUserName = document.getElementById('welcomeUserName');
const authModal = document.getElementById('authModal');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authForm = document.getElementById('authForm');
const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
const authModalTitle = document.getElementById('authModalTitle');
const roleSelectionGroup = document.getElementById('roleSelectionGroup');
const authToggleText = document.getElementById('authToggleText');
const submitAuthBtn = document.getElementById('submitAuthBtn');

// Upload Elements
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const browseFilesText = document.getElementById('browseFilesText');
const selectedFileName = document.getElementById('selectedFileName');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    checkAuthStatus();
    renderMajorsGrid();
    populateSelects();
    fetchFiles();
    setupEventListeners();
});

// --- Auth Status ---
function checkAuthStatus() {
    const token = localStorage.getItem('knowledgeBankToken');
    const userStr = localStorage.getItem('knowledgeBankUser');

    if (token && userStr) {
        currentState.token = token;
        currentState.user = JSON.parse(userStr);
    } else {
        currentState.token = null;
        currentState.user = null;
    }
    updateAuthUI();
}

function updateAuthUI() {
    if (currentState.user) {
        loggedOutState.style.display = 'none';
        loggedInState.style.display = 'flex';
        welcomeUserName.textContent = `مرحباً، ${currentState.user.username}`;
    } else {
        loggedOutState.style.display = 'flex';
        loggedInState.style.display = 'none';
    }
}

// --- API Calls ---
async function fetchFiles() {
    try {
        let url = new URL(`${API_URL}/files`);
        if (currentState.searchQuery) url.searchParams.append('search', currentState.searchQuery);
        if (currentState.view === 'browser' && currentState.selectedMajor && !currentState.searchQuery) {
            url.searchParams.append('major', currentState.selectedMajor);
            if (currentState.selectedLevel) url.searchParams.append('level', currentState.selectedLevel);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        currentState.files = data;
        updateUI();
    } catch (error) {
        console.error("Error fetching files:", error);
        showToast("فشل في جلب البيانات من الخادم", true);
        currentState.files = [];
        updateUI();
    }
}

async function uploadFile(formData) {
    try {
        const submitBtn = document.getElementById('submitUploadBtn');
        submitBtn.innerText = 'جاري الرفع...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_URL}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentState.token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Upload failed');

        closeUploadModal();
        showToast("تم رفع الملف بنجاح!");
        uploadForm.reset();
        selectedFileName.textContent = '';
        fetchFiles();
    } catch (error) {
        console.error("Error uploading file:", error);
        showToast(error.message || "فشل في رفع الملف", true);
        if (error.message.includes('token') || error.message.includes('Denied')) {
            handleLogout();
            openAuthModal();
        }
    } finally {
        const submitBtn = document.getElementById('submitUploadBtn');
        submitBtn.innerText = 'رفع الملف';
        submitBtn.disabled = false;
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;

    submitAuthBtn.disabled = true;
    submitAuthBtn.innerText = 'جاري المعالجة...';

    try {
        const url = currentState.authMode === 'login' ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
        const body = { username, password };
        if (currentState.authMode === 'register') {
            body.role = document.getElementById('authRole').value;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (currentState.authMode === 'register') {
            showToast("تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.");
            toggleAuthMode();
        } else {
            localStorage.setItem('knowledgeBankToken', data.token);
            localStorage.setItem('knowledgeBankUser', JSON.stringify(data.user));
            showToast("تم تسجيل الدخول بنجاح!");
            closeAuthModal();
            checkAuthStatus();
        }
    } catch (err) {
        showToast(err.message, true);
    } finally {
        submitAuthBtn.disabled = false;
        submitAuthBtn.innerText = currentState.authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب';
    }
}

function handleLogout() {
    localStorage.removeItem('knowledgeBankToken');
    localStorage.removeItem('knowledgeBankUser');
    checkAuthStatus();
    showToast("تم تسجيل الخروج");
}

// --- UI Updates ---
function updateUI() {
    if (currentState.view === 'home' && !currentState.searchQuery) {
        homeView.classList.add('active');
        browserView.classList.remove('active');
        renderLatestFiles();
    } else {
        homeView.classList.remove('active');
        browserView.classList.add('active');
        renderBrowserView();
    }
    lucide.createIcons();
}

function renderMajorsGrid() {
    majorsGrid.innerHTML = MAJORS.map(major => `
        <button class="major-card" onclick="selectMajor('${major.id}')">
            <div class="major-card-bg" style="background-color: ${major.bg};"></div>
            <div class="major-icon-wrapper" style="background-color: ${major.bg}; color: ${major.color};">
                <i data-lucide="${major.icon}"></i>
            </div>
            <h3 class="major-short">${major.short}</h3>
            <p class="major-name">${major.name}</p>
        </button>
    `).join('');
}

function renderLatestFiles() {
    const latest = currentState.files.slice(0, 4);
    latestFilesGrid.innerHTML = latest.map(file => createFileCard(file, true)).join('');
}

function renderBrowserView() {
    const major = MAJORS.find(m => m.id === currentState.selectedMajor);

    if (currentState.searchQuery) {
        breadcrumbCurrent.textContent = "نتائج البحث";
        browserTitle.innerHTML = `نتائج: "${currentState.searchQuery}"`;
        levelsTabsContainer.style.display = 'none';
        browserSearchInput.value = currentState.searchQuery;
    } else if (major) {
        breadcrumbCurrent.textContent = major.name;
        browserTitle.innerHTML = `<i data-lucide="${major.icon}" style="color: ${major.color}"></i> ${major.name}`;
        levelsTabsContainer.style.display = 'block';
        renderLevelsTabs();
        browserSearchInput.value = '';
    }

    if (currentState.files.length > 0) {
        browserFilesGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        browserFilesGrid.innerHTML = currentState.files.map(file => createFileCard(file, !!currentState.searchQuery)).join('');
    } else {
        browserFilesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

function renderLevelsTabs() {
    levelsTabs.innerHTML = LEVELS.map(level => `
        <button class="level-tab ${currentState.selectedLevel === level.id ? 'active' : ''}" onclick="selectLevel(${level.id})">
            <div class="level-badge">L${level.id}</div>
            ${level.name}
        </button>
    `).join('');
}

function createFileCard(file, showMajorBadge) {
    const major = MAJORS.find(m => m.id === file.majorId);
    const typeClass = file.type === 'PDF' ? 'type-pdf' : file.type.startsWith('DOC') ? 'type-doc' : 'type-zip';
    const fakeSize = Math.floor(Math.random() * 10) + 1;

    return `
        <div class="file-card ${typeClass}">
            <div class="file-type-accent"></div>
            <div class="file-header">
                <div class="file-icon"><i data-lucide="file-text"></i></div>
                <div class="file-info">
                    <h3 class="file-title" title="${file.title}">${file.title}</h3>
                    <span class="file-subject">${file.subject}</span>
                </div>
            </div>
            <div class="file-footer">
                <div class="file-meta">
                    <span class="file-uploader">بواسطة: ${file.uploader}</span>
                    <div class="file-rating">
                        <span>${file.rating}</span>
                        <i data-lucide="star" class="text-yellow icon-filled" style="width: 14px; height: 14px;"></i>
                    </div>
                </div>
                ${showMajorBadge && major ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                        <i data-lucide="${major.icon}" style="width: 12px; height: 12px;"></i>
                        ${major.short} - مستوى ${file.levelId}
                    </div>
                ` : ''}
                <div class="file-actions">
                    <span class="file-badge">${file.type} | ${fakeSize} MB</span>
                    <a href="${API_URL}${file.fileUrl}" target="_blank" class="download-link">تحميل الملف</a>
                </div>
            </div>
        </div>
    `;
}

function populateSelects() {
    const majorSelect = document.getElementById('uploadMajor');
    const levelSelect = document.getElementById('uploadLevel');
    majorSelect.innerHTML = MAJORS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    levelSelect.innerHTML = LEVELS.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
}

// --- Actions ---
window.goHome = () => {
    currentState.view = 'home';
    currentState.selectedMajor = null;
    currentState.selectedLevel = null;
    currentState.searchQuery = '';
    mainSearchInput.value = '';
    fetchFiles();
};

window.selectMajor = (majorId) => {
    currentState.view = 'browser';
    currentState.selectedMajor = majorId;
    currentState.selectedLevel = 1;
    currentState.searchQuery = '';
    fetchFiles();
};

window.selectLevel = (levelId) => {
    currentState.selectedLevel = levelId;
    fetchFiles();
};

function handleSearch(query) {
    currentState.searchQuery = query;
    if (query) {
        currentState.view = 'browser';
    } else if (!currentState.selectedMajor) {
        currentState.view = 'home';
    }
    fetchFiles();
}

function toggleAuthMode() {
    currentState.authMode = currentState.authMode === 'login' ? 'register' : 'login';
    if (currentState.authMode === 'register') {
        authModalTitle.innerHTML = `<i data-lucide="user-plus" class="text-blue"></i> إنشاء حساب`;
        submitAuthBtn.innerText = 'إنشاء حساب';
        roleSelectionGroup.style.display = 'flex';
        authToggleText.innerText = 'لديك حساب بالفعل؟';
        toggleAuthModeBtn.innerText = 'تسجيل الدخول';
    } else {
        authModalTitle.innerHTML = `<i data-lucide="user" class="text-blue"></i> تسجيل الدخول`;
        submitAuthBtn.innerText = 'تسجيل الدخول';
        roleSelectionGroup.style.display = 'none';
        authToggleText.innerText = 'ليس لديك حساب؟';
        toggleAuthModeBtn.innerText = 'إنشاء حساب جديد';
    }
    lucide.createIcons();
}

function openAuthModal() {
    authModal.style.display = 'flex';
}

function closeAuthModal() {
    authModal.style.display = 'none';
    authForm.reset();
}

function openUploadModal() {
    uploadModal.style.display = 'flex';
}

function closeUploadModal() {
    uploadModal.style.display = 'none';
    uploadForm.reset();
    selectedFileName.textContent = '';
}

// --- Event Listeners ---
function setupEventListeners() {
    // Theme Toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleTheme);

    // Search
    let searchTimeout;
    mainSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
    });
    browserSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
    });

    // Auth Listeners
    openAuthBtn.addEventListener('click', openAuthModal);
    closeAuthBtn.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
    toggleAuthModeBtn.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });
    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', handleLogout);

    // Upload Modal Listeners
    openUploadBtn.addEventListener('click', openUploadModal);
    closeUploadBtn.addEventListener('click', closeUploadModal);
    uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) closeUploadModal(); });

    // File Dropzone Listeners
    browseFilesText.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary-blue)';
        dropzone.style.backgroundColor = 'var(--blue-light)';
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
        dropzone.style.backgroundColor = '';
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        dropzone.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            updateFileName();
        }
    });
    fileInput.addEventListener('change', updateFileName);

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        uploadFile(formData);
    });
}

function updateFileName() {
    if (fileInput.files.length > 0) {
        selectedFileName.textContent = `الملف المختار: ${fileInput.files[0].name}`;
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// --- Theme ---
function initTheme() {
    const isDark = localStorage.getItem('knowledgeBankTheme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('moonIcon').style.display = 'none';
        document.getElementById('sunIcon').style.display = 'block';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.setItem('knowledgeBankTheme', isDark ? 'dark' : 'light');
    document.getElementById('moonIcon').style.display = isDark ? 'none' : 'block';
    document.getElementById('sunIcon').style.display = isDark ? 'block' : 'none';
}
