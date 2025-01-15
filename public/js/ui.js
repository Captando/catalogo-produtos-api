window.UI = {
    formatPrice(price) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    },

    showMessage(type, message) {
        const element = document.getElementById(`${type}Message`);
        if (!element) return;

        element.textContent = message;
        element.style.display = 'block';

        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    },

    showCopiedTooltip(message = 'Copiado!') {
        const tooltip = document.getElementById('copiedTooltip');
        if (!tooltip) return;

        tooltip.textContent = message;
        tooltip.classList.add('show');

        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 2000);
    },

    setUserRole(role) {
        const roleElement = document.getElementById('userRole');
        if (!roleElement) return;

        switch(role) {
            case 'admin':
                roleElement.textContent = 'Administrador';
                break;
            case 'user':
                roleElement.textContent = 'Colaborador';
                break;
            default:
                roleElement.textContent = role;
        }
    }
};