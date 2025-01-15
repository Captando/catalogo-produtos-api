window.app = {
    init() {
        this.loginScreen = document.getElementById('loginScreen');
        this.mainContent = document.getElementById('mainContent');
        this.adminControls = document.getElementById('adminControls');

        // Verificar autenticação
        if (window.auth.isAuthenticated()) {
            this.showMainContent();
        } else {
            this.showLoginScreen();
        }
    },

    showLoginScreen() {
        this.loginScreen.style.display = 'flex';
        this.mainContent.style.display = 'none';
    },

    showMainContent() {
        this.loginScreen.style.display = 'none';
        this.mainContent.style.display = 'block';
        
        // Mostrar role do usuário
        UI.setUserRole(window.auth.user.role);

        // Mostrar controles de admin se necessário
        if (window.auth.isAdmin()) {
            this.adminControls.style.display = 'block';
        }
    },

    logout() {
        window.auth.logout();
    }
};

// Inicializar app quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => window.app.init());