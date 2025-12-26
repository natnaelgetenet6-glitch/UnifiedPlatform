/**
 * App.js V2
 * Refactored for Multi-Page Architecture
 */

class App {
    constructor() {
        this.currentUser = window.Auth.currentUser;
        this.init();
    }

    init() {
        if (!this.currentUser) return;

        this.renderSidebar();
        this.updateUserInfo();

        // Default Route: Admin -> Overview, Others -> Their Dashboard
        let startView = 'admin-overview';
        if (this.currentUser.role === 'exchange_user') startView = 'exchange-dashboard';
        if (this.currentUser.role === 'pharmacy_user') startView = 'pharmacy-dashboard';
        if (this.currentUser.role === 'construction_user') startView = 'construction-dashboard';

        this.navigateTo(startView);

        document.getElementById('logoutBtn').addEventListener('click', () => window.Auth.logout());
    }

    updateUserInfo() {
        document.getElementById('displayUsername').textContent = this.currentUser.name;
        document.getElementById('displayRole').textContent = this.currentUser.role.replace('_', ' ').toUpperCase();
    }

    renderSidebar() {
        const sidebar = document.getElementById('sidebar-menu');
        sidebar.innerHTML = '';

        const structure = [
            {
                header: 'Main',
                roles: ['admin'],
                items: [
                    { id: 'admin-overview', label: 'Overview', icon: '📊' }
                ]
            },
            {
                header: 'Money Exchange',
                roles: ['admin', 'exchange_user'],
                items: [
                    { id: 'exchange-dashboard', label: 'Dashboard', icon: '📈' },
                    { id: 'exchange-buy', label: 'Buy Currency', icon: '📥', submenu: true },
                    { id: 'exchange-sell', label: 'Sell Currency', icon: '📤', submenu: true },
                    { id: 'exchange-records', label: 'Transactions', icon: '📝', submenu: true }
                ]
            },
            {
                header: 'Pharmacy',
                roles: ['admin', 'pharmacy_user'],
                items: [
                    { id: 'pharmacy-dashboard', label: 'Dashboard', icon: '🏥' },
                    { id: 'pharmacy-pos', label: 'Point of Sale', icon: '🛒', submenu: true },
                    { id: 'pharmacy-stock', label: 'Stock Management', icon: '📦', submenu: true },
                    { id: 'pharmacy-records', label: 'Sales History', icon: '📑', submenu: true }
                ]
            },
            {
                header: 'Construction',
                roles: ['admin', 'construction_user'],
                items: [
                    { id: 'construction-dashboard', label: 'Dashboard', icon: '🏗️' },
                    { id: 'construction-expense', label: 'Log Expense', icon: '💸', submenu: true },
                    { id: 'construction-income', label: 'Log Income', icon: '💰', submenu: true },
                    { id: 'construction-records', label: 'Financials', icon: '📋', submenu: true }
                ]
            }
        ];

        structure.forEach(section => {
            if (this.hasAccess(section.roles)) {
                // Section Header
                if (section.header) {
                    const liHead = document.createElement('li');
                    liHead.className = 'menu-category';
                    liHead.textContent = section.header;
                    sidebar.appendChild(liHead);
                }

                // Items
                section.items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'menu-item';
                    if (item.submenu) li.classList.add('submenu-item'); // visual indent
                    li.dataset.target = item.id;
                    li.innerHTML = `<span class="icon">${item.icon}</span> ${item.label}`;
                    li.onclick = () => this.navigateTo(item.id);
                    sidebar.appendChild(li);
                });
            }
        });
    }

    hasAccess(allowedRoles) {
        if (this.currentUser.role === 'admin') return true;
        return allowedRoles.includes(this.currentUser.role);
    }

    navigateTo(viewId) {
        // Toggle Active State in Sidebar
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const link = document.querySelector(`.menu-item[data-target="${viewId}"]`);
        if (link) link.classList.add('active');

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
            this.handleViewLoad(viewId);
        }
    }

    handleViewLoad(viewId) {
        // Trigger specific logic when a view loads
        const [module, action] = viewId.split('-'); // e.g., 'exchange-buy' -> module='exchange', action='buy'

        console.log(`Navigating to: ${module} -> ${action}`);

        if (module === 'admin') this.renderAdminDashboard();

        // Delegate to module controllers if they exist
        if (module === 'exchange' && window.ExchangeModule) window.ExchangeModule.onViewLoad(action);
        if (module === 'pharmacy' && window.PharmacyModule) window.PharmacyModule.onViewLoad(action);
        if (module === 'construction' && window.ConstructionModule) window.ConstructionModule.onViewLoad(action);
    }

    renderAdminDashboard() {
        // Aggregation Logic for Admin
        if (window.ExchangeModule) window.ExchangeModule.updateStats();
        if (window.PharmacyModule) window.PharmacyModule.updateStats();
        if (window.ConstructionModule) window.ConstructionModule.updateStats();

        // Calculate Net Platform Profit (Estimate)
        // Exchange: Estimate profit as 1% of volume (mock logic) or just use volume for now?
        // Let's use: Pharmacy Sales + Construction Balance + (Exchange Volume * 0.01)

        const exTx = window.Store.get('exchange_transactions') || [];
        const exVol = exTx.reduce((a, c) => a + (c.amount * c.rate), 0);
        const exProfit = exVol * 0.02; // Assume 2% spread revenue

        const phTx = window.Store.get('pharmacy_sales') || [];
        const phRev = phTx.reduce((a, c) => a + c.total, 0); // Revenue, not profit, but approx for now

        const coExp = window.Store.get('construction_expenses') || [];
        const coInc = window.Store.get('construction_income') || [];
        const coBal = coInc.reduce((a, c) => a + c.amount, 0) - coExp.reduce((a, c) => a + c.amount, 0);

        const netProfit = exProfit + phRev + coBal;

        const npEl = document.getElementById('stat-net-profit');
        if (npEl) npEl.textContent = netProfit.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

        this.renderActivityStream();
    }

    renderActivityStream() {
        const streamContainer = document.getElementById('activity-stream');
        if (!streamContainer) return;

        // Collect all transactions
        let activities = [];

        // Exchange
        const exTx = window.Store.get('exchange_transactions') || [];
        activities = activities.concat(exTx.map(t => ({
            time: t.date,
            desc: `Exchange: ${t.type.toUpperCase()} ${t.currency} ${t.amount}`,
            type: 'exchange'
        })));

        // Pharmacy
        const phTx = window.Store.get('pharmacy_sales') || [];
        activities = activities.concat(phTx.map(t => ({
            time: t.date ? t.date : new Date().toISOString(), // fallback
            desc: `Pharmacy: Sale of $${t.total.toFixed(2)}`,
            type: 'pharmacy'
        })));

        // Construction
        const coExp = window.Store.get('construction_expenses') || [];
        const coInc = window.Store.get('construction_income') || [];
        activities = activities.concat(coExp.map(t => ({
            time: t.date, desc: `Construction: Expense - ${t.description}`, type: 'construction'
        })));
        activities = activities.concat(coInc.map(t => ({
            time: t.date, desc: `Construction: Income - ${t.description}`, type: 'construction'
        })));

        // Sort & Slice
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const recent = activities.slice(0, 10);

        streamContainer.innerHTML = '';
        recent.forEach(act => {
            streamContainer.innerHTML += `
                <li class="activity-item">
                    <span class="activity-time">${new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="activity-desc">${act.desc}</span>
                </li>
            `;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.Auth.checkAuth();
    window.App = new App();
});
