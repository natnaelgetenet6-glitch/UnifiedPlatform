/**
 * Auth.js
 * Handles Login, Logout, and Role Checks
 */

class Auth {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('active_user'));
    }

    login(username, password) {
        const users = window.Store.get('unified_users');
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            sessionStorage.setItem('active_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    logout() {
        sessionStorage.removeItem('active_user');
        window.location.href = 'index.html';
    }

    checkAuth() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
        }
    }

    hasAccess(module) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'admin') return true;

        // Map roles to modules
        const permissions = {
            'exchange_user': ['exchange'],
            'pharmacy_user': ['pharmacy'],
            'construction_user': ['construction']
        };

        const allowedModules = permissions[this.currentUser.role] || [];
        return allowedModules.includes(module);
    }
}

const auth = new Auth();
window.Auth = auth;
