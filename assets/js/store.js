/**
 * Store.js
 * Manages LocalStorage and Mock Data
 */

const MOCK_USERS = [
    { username: 'admin', password: '123', role: 'admin', name: 'Super Admin' },
    { username: 'exchange', password: '123', role: 'exchange_user', name: 'Money Exchange Staff' },
    { username: 'pharmacy', password: '123', role: 'pharmacy_user', name: 'Pharmacy Clerk' },
    { username: 'construction', password: '123', role: 'construction_user', name: 'Site Manager' }
];

const INIT_KEYS = {
    'unified_users': MOCK_USERS,
    'exchange_transactions': [],
    'pharmacy_items': [
        { id: 1, name: 'Paracetamol', buy_price: 10, sell_price: 15, qty: 100, unit_type: 'pcs', pieces_per_box: 1, manuf_date: '2024-01-01', expiry_date: '2026-01-01' },
        { id: 2, name: 'Amoxicillin', buy_price: 25, sell_price: 40, qty: 50, unit_type: 'box', pieces_per_box: 10, manuf_date: '2023-06-01', expiry_date: '2025-06-01' },
        { id: 3, name: 'Vitamin C', buy_price: 5, sell_price: 8, qty: 200, unit_type: 'pcs', pieces_per_box: 1, manuf_date: '2024-03-01', expiry_date: '2026-03-01' }
    ],
    'pharmacy_sales': [],
    'construction_expenses': [],
    'construction_income': []
};

class Store {
    constructor() {
        this.init();
    }

    init() {
        // Initialize mock data if not present
        for (const [key, value] of Object.entries(INIT_KEYS)) {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
    }

    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // Helper to add mock transaction
    add(key, item) {
        const list = this.get(key) || [];
        item.id = Date.now(); // Simple ID generation
        item.date = new Date().toISOString();
        list.push(item);
        this.set(key, list);
        return item;
    }
}

const store = new Store();
window.Store = store;
