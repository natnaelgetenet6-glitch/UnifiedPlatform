/**
 * Pharmacy.js V2
 * Pharmacy Stock & Sales Module Multi-View
 */

class PharmacyModule {
    constructor() {
        this.stockKey = 'pharmacy_items';
        this.salesKey = 'pharmacy_sales';
        this.cart = [];
        this.init();
    }

    init() {
        // Any init logic
    }

    onViewLoad(action) {
        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'pos':
                this.updatePosSelect();
                this.renderCart();
                break;
            case 'stock':
                this.renderStock();
                break;
            case 'records':
                this.renderRecords();
                break;
        }
    }

    // --- Dashboard ---
    renderDashboard() {
        const sales = window.Store.get(this.salesKey) || [];
        const stock = window.Store.get(this.stockKey) || [];

        // Today's Sales
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = sales
            .filter(s => (s.date && s.date.startsWith(todayStr)))
            .reduce((acc, curr) => acc + curr.total, 0);

        // Low Stock (< 10)
        const lowStock = stock.filter(i => i.qty < 10).length;

        document.getElementById('ph-today-sales').textContent = todaySales.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('ph-low-stock').textContent = lowStock;

        this.updateStats(); // Also sync global
    }

    updateStats() {
        // Global
        const sales = window.Store.get(this.salesKey) || [];
        const total = sales.reduce((a, c) => a + c.total, 0);
        const el = document.getElementById('stat-pharmacy');
        if (el) el.textContent = total.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- POS ---
    updatePosSelect() {
        const items = window.Store.get(this.stockKey) || [];
        const select = document.getElementById('pos-item-select');
        select.innerHTML = '<option value="">-- Select Item --</option>';
        items.forEach(i => {
            // Basic check for out of stock
            const disabled = i.qty <= 0 ? 'disabled' : '';
            const label = i.qty <= 0 ? `${i.name} (Out of Stock)` : `${i.name} ($${(i.buy_price * 1.5).toFixed(2)}) - ${i.qty} left`;

            select.innerHTML += `<option value="${i.id}" data-price="${i.buy_price * 1.5}" ${disabled}>${label}</option>`;
        });
    }

    addToCart() {
        const select = document.getElementById('pos-item-select');
        const qtyInput = document.getElementById('pos-qty');
        const itemId = parseInt(select.value);
        const qty = parseInt(qtyInput.value);

        if (!itemId || qty <= 0) {
            alert('Please select an item and valid quantity');
            return;
        }

        const items = window.Store.get(this.stockKey);
        const stockItem = items.find(i => i.id === itemId);

        if (stockItem.qty < qty) {
            alert('Insufficient Stock!');
            return;
        }

        // Add to cart
        const existing = this.cart.find(c => c.itemId === itemId);
        if (existing) {
            if (existing.qty + qty > stockItem.qty) {
                alert('Cannot add more than available stock');
                return;
            }
            existing.qty += qty;
        } else {
            const sellPrice = stockItem.buy_price * 1.5;
            this.cart.push({
                itemId,
                name: stockItem.name,
                qty,
                price: sellPrice
            });
        }

        this.renderCart();
        // Reset inputs
        qtyInput.value = 1;
        select.value = '';
    }

    renderCart() {
        const list = document.getElementById('pos-cart-list');
        const totalEl = document.getElementById('pos-total');
        if (!list) return;

        list.innerHTML = '';
        let total = 0;

        this.cart.forEach((item, idx) => {
            const itemTotal = item.qty * item.price;
            total += itemTotal;
            list.innerHTML += `
                <li>
                    <span>${item.name} <small>x${item.qty}</small></span>
                    <span>$${itemTotal.toFixed(2)} <button onclick="window.PharmacyModule.removeFromCart(${idx})" style="color:red;border:none;background:none;cursor:pointer">×</button></span>
                </li>
            `;
        });

        totalEl.textContent = total.toFixed(2);
    }

    removeFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
    }

    checkout() {
        if (this.cart.length === 0) return;

        // 1. Save Sale Record
        const sale = {
            items: this.cart,
            total: this.cart.reduce((a, c) => a + (c.qty * c.price), 0)
        };
        window.Store.add(this.salesKey, sale);

        // 2. Decrement Stock
        const stock = window.Store.get(this.stockKey);
        this.cart.forEach(cartItem => {
            const stockItem = stock.find(i => i.id === cartItem.itemId);
            if (stockItem) {
                stockItem.qty -= cartItem.qty;
            }
        });
        window.Store.set(this.stockKey, stock);

        // 3. Clear Cart & UI
        this.cart = [];
        this.renderCart();
        this.updatePosSelect(); // refresh stock numbers in dropdown
        alert('Sale Completed!');
    }

    // --- Stock ---
    renderStock() {
        const items = window.Store.get(this.stockKey) || [];
        const tbody = document.getElementById('pharmacy-stock-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.buy_price}</td>
                <td>${item.qty}</td>
                <td>
                    <button class="btn-secondary" onclick="window.PharmacyModule.openStockModal(${item.id})">Restock/Edit</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openStockModal(itemId = null) {
        const items = window.Store.get(this.stockKey) || [];
        const item = itemId ? items.find(i => i.id === itemId) : null;

        const modal = document.getElementById('modal-container');
        document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'New Product';

        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <form id="stock-form">
                <input type="hidden" id="st-id" value="${item ? item.id : ''}">
                <div class="form-group">
                    <label>Item Name</label>
                    <input type="text" id="st-name" value="${item ? item.name : ''}" required>
                </div>
                <div class="form-group">
                    <label>Buy Price</label>
                    <input type="number" id="st-price" value="${item ? item.buy_price : ''}" required step="0.01">
                </div>
                <div class="form-group">
                    <label>Qty to Add</label>
                    <input type="number" id="st-qty" value="0" required>
                    ${item ? `<small>Current: ${item.qty}</small>` : ''}
                </div>
                <button type="submit" class="btn-primary">Save</button>
            </form>
        `;

        // Handle Submit
        document.getElementById('stock-form').onsubmit = (e) => {
            e.preventDefault();
            this.saveStockItem({
                id: document.getElementById('st-id').value,
                name: document.getElementById('st-name').value,
                price: parseFloat(document.getElementById('st-price').value),
                qty: parseInt(document.getElementById('st-qty').value)
            }, item);
            modal.classList.add('hidden');
        };

        modal.classList.remove('hidden');
        modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    }

    saveStockItem(formData, originalItem) {
        let items = window.Store.get(this.stockKey) || [];
        if (originalItem) {
            const idx = items.findIndex(i => i.id == originalItem.id);
            if (idx !== -1) {
                items[idx].name = formData.name;
                items[idx].buy_price = formData.price;
                items[idx].qty += formData.qty;
            }
        } else {
            window.Store.add(this.stockKey, {
                name: formData.name,
                buy_price: formData.price,
                qty: formData.qty
            });
            items = window.Store.get(this.stockKey);
        }
        window.Store.set(this.stockKey, items);
        this.renderStock();
    }

    // --- Records ---
    renderRecords() {
        const sales = window.Store.get(this.salesKey) || [];
        const tbody = document.getElementById('pharmacy-records-body');
        tbody.innerHTML = '';

        sales.sort((a, b) => new Date(b.date) - new Date(a.date));

        sales.forEach(s => {
            const itemNames = s.items.map(i => `${i.name} (x${i.qty})`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(s.date).toLocaleString()}</td>
                <td>${itemNames}</td>
                <td>${s.total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.PharmacyModule = new PharmacyModule();
