// ===== STATE MANAGEMENT =====
const AppState = {
    isLoggedIn: false,
    userEmail: '',
    userId: '',
    user: null,
    currentView: 'login',
    messages: []
};

// ===== DOM ELEMENTS =====
const elements = {
    authButtons: document.getElementById('authButtons'),
    userSection: document.getElementById('userSection'),
    userEmail: document.getElementById('userEmail'),
    loginBtn: document.getElementById('loginBtn'),
    signupBtn: document.getElementById('signupBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    createRoadmapBtn: document.getElementById('createRoadmapBtn'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    heroCTA: document.getElementById('heroCTA'),
    authModal: document.getElementById('authModal'),
    closeAuthModal: document.getElementById('closeAuthModal'),
    authTitle: document.getElementById('authTitle'),
    authSubtitle: document.getElementById('authSubtitle'),
    authEmail: document.getElementById('authEmail'),
    authPassword: document.getElementById('authPassword'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    authSwitchText: document.getElementById('authSwitchText'),
    authSwitchBtn: document.getElementById('authSwitchBtn'),
    chatModal: document.getElementById('chatModal'),
    closeChatModal: document.getElementById('closeChatModal'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// ===== UTILITIES =====
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--white);
        border: 3px solid var(--black);
        border-radius: 8px;
        padding: 1rem 1.5rem;
        box-shadow: 6px 6px 0 var(--black);
        font-family: 'Courier New', monospace;
        font-weight: bold;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== AUTH FUNCTIONS =====
function showAuthModal(isLogin) {
    AppState.currentView = isLogin ? 'login' : 'signup';
    updateAuthModal();
    elements.authModal.classList.remove('hidden');
    elements.authEmail.value = '';
    elements.authPassword.value = '';
    elements.authEmail.focus();
}

function hideAuthModal() {
    elements.authModal.classList.add('hidden');
}

function updateAuthModal() {
    const isLogin = AppState.currentView === 'login';

    elements.authTitle.textContent = isLogin ? 'LOGIN' : 'SIGNUP';
    elements.authSubtitle.textContent = isLogin
        ? 'Welcome back! Ready to continue your journey?'
        : 'Start your journey today. Create your first roadmap!';
    elements.authSubmitBtn.textContent = isLogin ? 'LOGIN' : 'CREATE ACCOUNT';
    elements.authSwitchText.textContent = isLogin
        ? "Don't have an account?"
        : 'Already have an account?';
    elements.authSwitchBtn.textContent = isLogin ? 'SIGNUP' : 'LOGIN';
}

function updateUIForLoggedInUser() {
    elements.authButtons.classList.add('hidden');
    elements.userSection.classList.remove('hidden');
    elements.userEmail.textContent = AppState.userEmail;
    elements.createRoadmapBtn.classList.remove('hidden');
    elements.heroCTA.classList.add('hidden');
}

function updateUIForLoggedOutUser() {
    elements.authButtons.classList.remove('hidden');
    elements.userSection.classList.add('hidden');
    elements.createRoadmapBtn.classList.add('hidden');
    elements.heroCTA.classList.remove('hidden');
}

// ===== CHAT FUNCTIONS =====
function showChatModal() {
    if (!AppState.isLoggedIn) {
        showAuthModal(true);
        return;
    }

    elements.chatModal.classList.remove('hidden');
    elements.chatInput.focus();
}

function hideChatModal() {
    elements.chatModal.classList.add('hidden');
}

function handleQuickPrompt(promptText) {
    elements.chatInput.value = promptText;
    sendMessage();
}

// ===== EVENT LISTENERS =====
elements.loginBtn.addEventListener('click', () => showAuthModal(true));
elements.signupBtn.addEventListener('click', () => showAuthModal(false));
elements.getStartedBtn.addEventListener('click', () => showAuthModal(false));
elements.logoutBtn.addEventListener('click', () => handleLogout());
elements.closeAuthModal.addEventListener('click', hideAuthModal);
elements.authSwitchBtn.addEventListener('click', () => {
    AppState.currentView = AppState.currentView === 'login' ? 'signup' : 'login';
    updateAuthModal();
});
elements.authSubmitBtn.addEventListener('click', handleAuth);

// Enter key for auth
elements.authEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.authPassword.focus();
});
elements.authPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuth();
});

// Chat functionality
if (elements.createRoadmapBtn) {
    elements.createRoadmapBtn.addEventListener('click', showChatModal);
} else {
    console.error('createRoadmapBtn not found');
}
elements.closeChatModal.addEventListener('click', hideChatModal);
elements.sendMessageBtn.addEventListener('click', sendMessage);
elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Quick prompts
document.querySelectorAll('.quick-prompt').forEach(button => {
    button.addEventListener('click', () => {
        handleQuickPrompt(button.textContent);
    });
});

// Close modals on overlay click
elements.authModal.addEventListener('click', (e) => {
    if (e.target === elements.authModal) hideAuthModal();
});
elements.chatModal.addEventListener('click', (e) => {
    if (e.target === elements.chatModal) hideChatModal();
});

// Smooth scroll for nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

console.log('🗺️ ROADMAP.AI Utils Initialized!');

