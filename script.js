class SimpleMessenger {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('messenger_users')) || {};
        this.messages = JSON.parse(localStorage.getItem('messenger_messages')) || {};
        this.currentUser = JSON.parse(localStorage.getItem('current_user')) || null;
        this.currentChatWith = null;
        this.isMobile = window.innerWidth <= 768;
        
        this.initializeElements();
        this.bindEvents();
        this.checkAuth();
        this.setupPWA();
    }

    initializeElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.registerScreen = document.getElementById('registerScreen');
        this.app = document.getElementById('app');
        
        this.loginUsername = document.getElementById('loginUsername');
        this.loginPassword = document.getElementById('loginPassword');
        this.registerUsername = document.getElementById('registerUsername');
        this.registerPassword = document.getElementById('registerPassword');
        
        this.chatList = document.getElementById('chatList');
        this.messageList = document.getElementById('messageList');
        this.messageInput = document.getElementById('messageInput');
        this.currentUsername = document.getElementById('currentUsername');
        this.currentChat = document.getElementById('currentChat');
        this.backBtn = document.getElementById('backBtn');
        
        this.searchContainer = document.getElementById('searchContainer');
        this.searchInput = document.getElementById('searchInput');
        
        this.installPrompt = document.getElementById('installPrompt');
        
        this.demoUsers = {
            'User_1': { password: '123', lastSeen: Date.now() },
            'User_2': { password: '123', lastSeen: Date.now() },
            'User_3': { password: '123', lastSeen: Date.now() },
            'User_4': { password: '123', lastSeen: Date.now() }
        };
    }

    bindEvents() {
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        document.getElementById('registerBtn').addEventListener('click', () => this.register());
        document.getElementById('showRegisterBtn').addEventListener('click', () => this.showScreen('register'));
        document.getElementById('showLoginBtn').addEventListener('click', () => this.showScreen('login'));
        
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('themeSwitch').addEventListener('click', () => this.toggleTheme());
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearch());
        document.getElementById('closeSearch').addEventListener('click', () => this.toggleSearch());
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        this.backBtn.addEventListener('click', () => this.closeChat());
        
        document.getElementById('installBtn').addEventListener('click', () => this.installPWA());
        document.getElementById('closeInstall').addEventListener('click', () => this.hideInstallPrompt());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        this.searchInput.addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });
        
        window.addEventListener('resize', () => this.handleResize());
        
        this.initializeDemoData();
    }

    handleResize() {
        this.isMobile = window.innerWidth <= 768;
        if (!this.isMobile && this.currentChatWith) {
            this.backBtn.style.display = 'none';
        }
    }

    setupPWA() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('Running as PWA');
        }
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        window.addEventListener('appinstalled', () => {
            this.hideInstallPrompt();
        });
    }

    showInstallPrompt() {
        if (!localStorage.getItem('installPromptShown')) {
            this.installPrompt.classList.remove('hidden');
            localStorage.setItem('installPromptShown', 'true');
        }
    }

    hideInstallPrompt() {
        this.installPrompt.classList.add('hidden');
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.hideInstallPrompt();
            }
            this.deferredPrompt = null;
        }
    }

    initializeDemoData() {
        let shouldUpdate = false;
        for (const [username, userData] of Object.entries(this.demoUsers)) {
            if (!this.users[username]) {
                this.users[username] = userData;
                shouldUpdate = true;
            }
        }
        
        if (shouldUpdate) {
            localStorage.setItem('messenger_users', JSON.stringify(this.users));
        }
    }

    checkAuth() {
        if (this.currentUser) {
            this.showApp();
        } else {
            this.showScreen('login');
        }
    }

    showScreen(screen) {
        this.loginScreen.classList.add('hidden');
        this.registerScreen.classList.add('hidden');
        this.app.classList.add('hidden');
        
        switch (screen) {
            case 'login':
                this.loginScreen.classList.remove('hidden');
                break;
            case 'register':
                this.registerScreen.classList.remove('hidden');
                break;
            case 'app':
                this.app.classList.remove('hidden');
                this.loadChats();
                break;
        }
    }

    login() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value;

        if (!username || !password) {
            this.showError('Заполните все поля');
            return;
        }

        if (this.demoUsers[username] && this.demoUsers[username].password === password) {
            this.currentUser = { username, password };
            localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            this.showApp();
            return;
        }

        if (!this.users[username] || this.users[username].password !== password) {
            this.showError('Неверный никнейм или пароль');
            return;
        }

        this.currentUser = { username, password };
        localStorage.setItem('current_user', JSON.stringify(this.currentUser));
        this.showApp();
    }

    register() {
        const username = this.registerUsername.value.trim();
        const password = this.registerPassword.value;

        if (!username || !password) {
            this.showError('Заполните все поля');
            return;
        }

        if (!/^[A-Za-z0-9_]+$/.test(username)) {
            this.showError('Никнейм может содержать только латинские буквы, цифры и символ _');
            return;
        }

        if (this.users[username] || this.demoUsers[username]) {
            this.showError('Этот никнейм уже занят');
            return;
        }

        this.users[username] = { password, lastSeen: Date.now() };
        localStorage.setItem('messenger_users', JSON.stringify(this.users));
        
        this.showSuccess('Аккаунт создан! Теперь войдите.');
        this.showScreen('login');
    }

    logout() {
        this.currentUser = null;
        this.currentChatWith = null;
        localStorage.removeItem('current_user');
        this.showScreen('login');
    }

    showApp() {
        this.currentUsername.textContent = this.currentUser.username;
        this.showScreen('app');
    }

    loadChats() {
        this.chatList.innerHTML = '';
        
        Object.keys(this.demoUsers).forEach(username => {
            if (username !== this.currentUser.username) {
                this.addChatItem(username, true);
            }
        });
        
        Object.keys(this.users).forEach(username => {
            if (username !== this.currentUser.username && !this.demoUsers[username]) {
                this.addChatItem(username, false);
            }
        });
        
        if (this.chatList.children.length === 0) {
            this.chatList.innerHTML = `
                <div class="empty-state">
                    <p>😔 Пока нет пользователей</p>
                    <p>Расскажите друзьям свой никнейм: <strong>${this.currentUser.username}</strong></p>
                </div>
            `;
        }
    }

    addChatItem(username, isDemo = false) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `
            <strong>${username}</strong>
            ${isDemo ? '<span style="color: var(--secondary-color); font-size: 0.8em;"> (демо)</span>' : ''}
        `;
        
        chatItem.addEventListener('click', () => this.openChat(username));
        this.chatList.appendChild(chatItem);
    }

    openChat(withUser) {
        this.currentChatWith = withUser;
        this.currentChat.textContent = `Чат с ${withUser}`;
        
        if (this.isMobile) {
            this.chatList.classList.add('hidden');
            this.backBtn.style.display = 'block';
        }
        
        document.querySelector('.message-area').classList.remove('hidden');
        
        this.messageInput.disabled = false;
        document.getElementById('sendBtn').disabled = false;
        
        this.loadMessages(withUser);
        this.messageInput.focus();
    }

    closeChat() {
        if (this.isMobile) {
            this.chatList.classList.remove('hidden');
            document.querySelector('.message-area').classList.add('hidden');
            this.backBtn.style.display = 'none';
            this.currentChatWith = null;
        }
    }

    loadMessages(withUser) {
        this.messageList.innerHTML = '';
        
        const chatId = [this.currentUser.username, withUser].sort().join('_');
        const chatMessages = this.messages[chatId] || [];
        
        if (chatMessages.length === 0) {
            this.messageList.innerHTML = `
                <div class="empty-chat">
                    <p>💬 Начните диалог с ${withUser}</p>
                    <p>Сообщения хранятся только в вашем браузере</p>
                </div>
            `;
            return;
        }
        
        chatMessages.forEach(msg => {
            this.addMessageToChat(msg.text, msg.sender === this.currentUser.username);
        });
        
        this.scrollToBottom();
    }

    addMessageToChat(text, isOutgoing = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOutgoing ? 'message-out' : 'message-in'}`;
        messageEl.textContent = text;
        this.messageList.appendChild(messageEl);
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.currentChatWith) return;
        
        const chatId = [this.currentUser.username, this.currentChatWith].sort().join('_');
        if (!this.messages[chatId]) this.messages[chatId] = [];
        
        this.messages[chatId].push({
            sender: this.currentUser.username,
            text: text,
            timestamp: Date.now()
        });
        
        localStorage.setItem('messenger_messages', JSON.stringify(this.messages));
        
        this.addMessageToChat(text, true);
        this.messageInput.value = '';
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messageList.scrollTop = this.messageList.scrollHeight;
    }

    toggleSearch() {
        this.searchContainer.classList.toggle('hidden');
        if (!this.searchContainer.classList.contains('hidden')) {
            this.searchInput.focus();
        }
    }

    searchUsers(query) {
        if (!query.trim()) {
            this.loadChats();
            return;
        }
        
        const filteredUsers = Object.keys(this.users).filter(username => 
            username.toLowerCase().includes(query.toLowerCase()) && 
            username !== this.currentUser.username
        );
        
        const filteredDemoUsers = Object.keys(this.demoUsers).filter(username => 
            username.toLowerCase().includes(query.toLowerCase()) && 
            username !== this.currentUser.username
        );
        
        this.chatList.innerHTML = '';
        
        [...filteredDemoUsers, ...filteredUsers].forEach(username => {
            this.addChatItem(username, this.demoUsers[username] !== undefined);
        });
        
        if (this.chatList.children.length === 0) {
            this.chatList.innerHTML = `
                <div class="empty-state">
                    <p>🔍 Пользователи не найдены</p>
                </div>
            `;
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        document.getElementById('themeSwitch').textContent = isDark ? '🌙' : '☀️';
    }

    showError(message) {
        alert(`Ошибка: ${message}`);
    }

    showSuccess(message) {
        alert(`Успех: ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SimpleMessenger();
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeSwitch').textContent = '☀️';
    }
    
    document.body.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});