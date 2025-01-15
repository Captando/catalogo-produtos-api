window.auth = {
    token: null,
    user: null,

    init() {
        this.loginForm = document.getElementById('loginForm');
        this.setupLoginForm();
        this.checkAuth();
    },

    setupLoginForm() {
        if (!this.loginForm) return;
        
        this.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });
    },

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao fazer login');
            }

            const data = await response.json();
            this.setSession(data);
            window.location.reload();
        } catch (error) {
            UI.showMessage('error', error.message);
        }
    },

    setSession(data) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('auth', JSON.stringify(data));
    },

    clearSession() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth');
    },

    checkAuth() {
        const auth = localStorage.getItem('auth');
        if (auth) {
            const data = JSON.parse(auth);
            this.token = data.token;
            this.user = data.user;
        }
    },

    isAuthenticated() {
        return !!this.token;
    },

    isAdmin() {
        return this.user?.role === 'admin';
    },

    logout() {
        this.clearSession();
        window.location.reload();
    }
};

// Inicializar autenticação
window.auth.init();