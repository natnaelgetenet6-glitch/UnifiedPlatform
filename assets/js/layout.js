/**
 * Layout.js
 * Injects shared UI (Sidebar, Topbar) into pages.
 * Handles relative path adjustments for links.
 */

class Layout {
    constructor() {
        this.basePath = this.determineBasePath();
        this.ensureLayoutContainers();
        this.ensureModal();
        this.renderSidebar();
        this.renderTopbar();
        this.highlightActivePage();
        this.checkAuth();
    }

    ensureLayoutContainers() {
        // If the page doesn't include the expected layout placeholders, create them
        if (!document.querySelector('.sidebar')) {
            const sb = document.createElement('aside');
            sb.className = 'sidebar';
            // insert at top so it's available for styling/positioning
            document.body.insertBefore(sb, document.body.firstChild);
        }

        if (!document.querySelector('.topbar')) {
            const tb = document.createElement('header');
            tb.className = 'topbar';
            // place after sidebar (or at top)
            const first = document.querySelector('.sidebar').nextSibling;
            if (first) document.body.insertBefore(tb, first);
            else document.body.appendChild(tb);
        }

        // Ensure main content wrapper exists so styles like .main-content apply
        if (!document.querySelector('.main-content')) {
            const main = document.createElement('main');
            main.className = 'main-content';
            // move existing body children (except sidebar/topbar) into main
            const sidebarEl = document.querySelector('.sidebar');
            const topbarEl = document.querySelector('.topbar');

            // collect nodes to move
            const nodes = [];
            document.body.childNodes.forEach(n => {
                if (n === sidebarEl || n === topbarEl) return;
                nodes.push(n);
            });

            nodes.forEach(n => main.appendChild(n));

            // append main
            document.body.appendChild(main);
        }
    }

    ensureModal() {
        if (document.getElementById('global-confirm-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'global-confirm-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="close-modal">×</div>
                <h3 id="gmodal-title" style="margin-top:0;margin-bottom:8px">Confirm</h3>
                <div id="gmodal-message" style="margin-bottom:12px;color:#475569"></div>
                <div id="gmodal-input" style="margin-bottom:12px;display:none"><textarea style="width:100%;height:80px;padding:8px;border:1px solid #e2e8f0;border-radius:6px" id="gmodal-textarea" placeholder="Reason (optional)"></textarea></div>
                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button id="gmodal-cancel" class="btn-secondary">Cancel</button>
                    <button id="gmodal-confirm" class="btn-danger">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => { modal.classList.add('hidden'); };
        modal.querySelector('.close-modal').onclick = close;
        modal.querySelector('#gmodal-cancel').onclick = close;
        // hide clicking on overlay
        modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });

        // Promise-based API
        window.UI = window.UI || {};
        window.UI.confirm = ({ title = 'Confirm', message = '', placeholder = '', confirmText = 'Confirm', cancelText = 'Cancel', allowInput = false } = {}) => {
            return new Promise((resolve) => {
                modal.classList.remove('hidden');
                const titleEl = modal.querySelector('#gmodal-title');
                const msgEl = modal.querySelector('#gmodal-message');
                const inputWrap = modal.querySelector('#gmodal-input');
                const ta = modal.querySelector('#gmodal-textarea');
                const btnConfirm = modal.querySelector('#gmodal-confirm');
                const btnCancel = modal.querySelector('#gmodal-cancel');

                titleEl.textContent = title;
                msgEl.textContent = message;
                btnConfirm.textContent = confirmText;
                btnCancel.textContent = cancelText;

                if (allowInput) { inputWrap.style.display = 'block'; ta.value = placeholder || ''; }
                else { inputWrap.style.display = 'none'; ta.value = ''; }

                const cleanup = (res) => {
                    modal.classList.add('hidden');
                    btnConfirm.onclick = null; btnCancel.onclick = null;
                    resolve(res);
                };

                btnConfirm.onclick = () => { cleanup({ confirmed: true, input: ta.value }); };
                btnCancel.onclick = () => { cleanup({ confirmed: false, input: null }); };
            });
        };

        // Printable receipt helper
        window.UI.printReceipt = {
            sale: (sale) => {
                const win = window.open('', '_blank');
                const user = sale.user || '';
                const date = new Date(sale.date).toLocaleString();
                let itemsHtml = '';
                if (Array.isArray(sale.items)) {
                    itemsHtml = `<table style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left;border-bottom:1px solid #ddd;padding:6px">Item</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Qty</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Unit</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Price</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Total</th></tr></thead><tbody>`;
                    sale.items.forEach(i => {
                        const q = i.orig_qty !== undefined && i.orig_qty !== null ? i.orig_qty : i.qty;
                        const unit = i.orig_unit || (i.unit_type === 'liquid' ? 'L' : 'pcs');
                        const price = (i.price||0).toFixed(2);
                        const total = ((i.qty||0)*(i.price||0)).toFixed(2);
                        itemsHtml += `<tr><td style="padding:6px;border-bottom:1px solid #f1f1f1">${i.name}</td><td style="padding:6px;border-bottom:1px solid #f1f1f1;text-align:right">${q}</td><td style="padding:6px;border-bottom:1px solid #f1f1f1;text-align:right">${unit}</td><td style="padding:6px;border-bottom:1px solid #f1f1f1;text-align:right">${price}</td><td style="padding:6px;border-bottom:1px solid #f1f1f1;text-align:right">${total}</td></tr>`;
                    });
                    itemsHtml += `</tbody></table>`;
                }
                const html = `
                    <html><head><title>Receipt</title></head><body style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:18px">
                    <h2>Receipt</h2>
                    <div>Sale ID: ${sale.id || ''}</div>
                    <div>Date: ${date}</div>
                    <div>Cashier: ${user}</div>
                    ${itemsHtml}
                    <div style="margin-top:12px;font-weight:bold">Total: $${(sale.total||0).toFixed(2)}</div>
                    <div style="margin-top:18px;color:#666">Thank you for your purchase.</div>
                    </body></html>`;
                win.document.write(html);
                win.document.close();
                win.focus();
                win.print();
            },
            transaction: (tx) => {
                const win = window.open('', '_blank');
                const date = new Date(tx.date).toLocaleString();
                const html = `
                    <html><head><title>Receipt</title></head><body style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:18px">
                    <h2>Transaction Receipt</h2>
                    <div>Transaction ID: ${tx.id || ''}</div>
                    <div>Date: ${date}</div>
                    <div>Type: ${tx.type || ''}</div>
                    <div>Customer: ${tx.customer || ''}</div>
                    <div>ID Card: ${tx.id_card || ''}</div>
                    <div>Currency: ${tx.currency || ''}</div>
                    <div>Amount: ${tx.amount ? tx.amount.toFixed(2) : '0.00'}</div>
                    <div>Rate: ${tx.rate ? tx.rate.toFixed(4) : '0.0000'}</div>
                    <div style="margin-top:12px;font-weight:bold">Total: $${(tx.amount * tx.rate || 0).toFixed(2)}</div>
                    <div style="margin-top:18px;color:#666">Thank you.</div>
                    </body></html>`;
                win.document.write(html);
                win.document.close();
                win.focus();
                win.print();
            }
        };
    }

    determineBasePath() {
        // Simple heuristic: count how many levels deep we are relative to the root 'UnifiedPlatform'
        // If we serve via file://, location.pathname is full path.
        // We assume structure: 
        // root/index.html (depth 0)
        // root/admin/dash.html (depth 1)
        // root/modules/exch/dash.html (depth 2)

        // Better approach: scripts are loaded with a relative path in the HTML.
        // We can just rely on the fact that if this script is loaded, we can infer paths based on where 'assets' is.
        // But for generating LINKS in the sidebar, we need to know "Up X levels".

        // Let's rely on a global config or the script tag source.
        // Quick hack: check if we are in 'modules' or 'admin'
        if (window.location.href.includes('/modules/')) return '../../';
        if (window.location.href.includes('/admin/')) return '../';
        return './';
    }

    checkAuth() {
        // Verify user is logged in
        if (!sessionStorage.getItem('active_user') && !window.location.href.endsWith('index.html')) {
            window.location.href = this.basePath + 'index.html';
        }
    }

    logout() {
        sessionStorage.removeItem('active_user');
        window.location.href = this.basePath + 'index.html';
    }

    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const bp = this.basePath;
        const user = JSON.parse(sessionStorage.getItem('active_user') || '{}');
        const role = user.role;

        // Helper to check role access
        const hasAccess = (roles) => role === 'admin' || roles.includes(role);

        // Sidebar Content
        sidebar.innerHTML = `
            <div class="brand">
                <h2>UniManage</h2>
            </div>
            <nav class="nav-menu">
                <ul id="sidebar-menu"></ul>
            </nav>
        `;

        const menuCtx = document.getElementById('sidebar-menu');

        const structure = [
            {
                header: 'Main',
                roles: ['admin'],
                items: [
                    { label: 'Overview', icon: '📊', link: 'admin/dashboard.html' }
                ]
            },
            {
                header: 'Administration',
                roles: ['admin'],
                items: [
                    { label: 'Users', icon: '👥', link: 'admin/users.html' },
                    { label: 'System Logs', icon: '📋', link: 'admin/logs.html' }
                ]
            },
            {
                header: 'Money Exchange',
                roles: ['admin', 'exchange_user'],
                items: [
                    { label: 'Dashboard', icon: '📈', link: 'modules/exchange/dashboard.html' },
                    { label: 'Holdings', icon: '💼', link: 'modules/exchange/stock.html' },
                        { label: 'Manage Rates', icon: '⚙️', link: 'modules/exchange/manage.html', adminOnly: true },
                    { label: 'Buy Currency', icon: '📥', link: 'modules/exchange/buy.html' },
                    { label: 'Sell Currency', icon: '📤', link: 'modules/exchange/sell.html' },
                    { label: 'Transactions', icon: '📝', link: 'modules/exchange/records.html' }
                ]
            },
            {
                header: 'Pharmacy',
                roles: ['admin', 'pharmacy_user'],
                items: [
                    { label: 'Dashboard', icon: '🏥', link: 'modules/pharmacy/dashboard.html' },
                    { label: 'Point of Sale', icon: '🛒', link: 'modules/pharmacy/pos.html' },
                    { label: 'Stock Mgmt', icon: '📦', link: 'modules/pharmacy/stock.html' },
                    { label: 'Sales History', icon: '📑', link: 'modules/pharmacy/records.html' }
                ]
            },
            {
                header: 'Construction',
                roles: ['admin', 'construction_user'],
                items: [
                    { label: 'Dashboard', icon: '🏗️', link: 'modules/construction/dashboard.html' },
                    { label: 'Log Expense', icon: '💸', link: 'modules/construction/expense.html' },
                    { label: 'Log Income', icon: '💰', link: 'modules/construction/income.html' },
                    { label: 'Financials', icon: '📋', link: 'modules/construction/records.html' }
                ]
            }
        ];

        structure.forEach(section => {
            if (hasAccess(section.roles)) {
                if (section.header) {
                    const h = document.createElement('li');
                    h.className = 'menu-category';
                    h.textContent = section.header;
                    menuCtx.appendChild(h);
                }
                section.items.forEach(item => {
                    // skip admin-only items for non-admins
                    if (item.adminOnly && role !== 'admin') return;
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <a href="${bp + item.link}" class="menu-item">
                            <span class="icon">${item.icon}</span> ${item.label}
                        </a>
                    `;
                    menuCtx.appendChild(li);
                });
            }
        });
    }

    renderTopbar() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        const user = JSON.parse(sessionStorage.getItem('active_user') || '{}');
        const roleLabel = user.role ? user.role.replace('_', ' ').toUpperCase() : 'GUEST';

        // Keep existing page title logic if it exists, roughly
        const pageTitle = document.title.split('-')[1] || 'Dashboard';

        topbar.innerHTML = `
            <div class="page-title"><button id="navToggle" class="burger" aria-label="Toggle navigation"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button><h2>${pageTitle}</h2></div>
            <div class="user-info">
                <span class="username">${user.name || 'User'}</span>
                <span class="role-badge">${roleLabel}</span>
                <button id="logoutBtn" class="logout-btn">Logout</button>
            </div>
        `;

        // Toggle sidebar on mobile, manage overlay, and animate burger
        const navToggle = document.getElementById('navToggle');
        const sidebar = document.querySelector('.sidebar');
        if (navToggle && sidebar) {
            // ensure overlay exists
            let overlay = document.getElementById('sidebarOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebarOverlay';
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
            }

            // click burger to toggle
            navToggle.addEventListener('click', () => {
                // toggle sidebar
                sidebar.classList.toggle('open-mobile');
                const open = sidebar.classList.contains('open-mobile');
                // animate burger
                navToggle.classList.toggle('open', open);
                // show/hide overlay
                overlay.classList.toggle('open', open);
            });

            // click overlay to close
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open-mobile');
                navToggle.classList.remove('open');
                overlay.classList.remove('open');
            });

            // auto-close sidebar when a menu item is selected (mobile)
            document.addEventListener('click', (ev) => {
                const target = ev.target.closest && ev.target.closest('.menu-item');
                if (target && sidebar.classList.contains('open-mobile')) {
                    // allow navigation to proceed but close UI immediately
                    sidebar.classList.remove('open-mobile');
                    navToggle.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        }

        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    highlightActivePage() {
        // Naive check: matches filename
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.menu-item');
        links.forEach(link => {
            // Check if link href matches end of current path
            // href might be "../../modules/ex..." vs path ".../modules/ex..."
            // simplified:
            const hrefFile = link.getAttribute('href').split('/').pop();
            const currFile = currentPath.split('/').pop();

            // Also check folder to differentiate dashboards
            // href: ../../modules/exchange/dashboard.html
            // path: .../modules/exchange/dashboard.html

            // Just comparing the full relative href against the end of the location path is tricky.
            // Let's compare "modules/exchange/dashboard.html"

            // If the relative part matches
            // This is purely visual, can be imperfect
            if (link.href === window.location.href) {
                link.classList.add('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.Layout = new Layout();
});
