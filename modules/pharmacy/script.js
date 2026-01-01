/**
 * Pharmacy Module Script
 */
class PharmacyModule {
    constructor() {
        this.stockKey = 'pharmacy_items';
        this.salesKey = 'pharmacy_sales';
        this.cart = [];
    }

    initDashboard() {
        const sales = window.Store.get(this.salesKey) || [];
        const stock = window.Store.get(this.stockKey) || [];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Period boundaries
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const start1Month = new Date(now); start1Month.setMonth(now.getMonth() - 1);
        const start3Month = new Date(now); start3Month.setMonth(now.getMonth() - 3);

        let today = 0, weekly = 0, monthly = 0, m1 = 0, m3 = 0;
        let profit1 = 0, profit3 = 0;

        // Data for chart: { itemName: { rev: 0, profit: 0 } }
        const itemPerf = {};

        sales.forEach(s => {
            const d = new Date(s.date);
            const isToday = s.date.startsWith(todayStr);
            const isWeek = d >= startOfWeek;
            const isMonth = d >= startOfMonth;
            const is1Month = d >= start1Month;
            const is3Month = d >= start3Month;

            if (isToday) today += s.total;
            if (isWeek) weekly += s.total;
            if (isMonth) monthly += s.total;
            if (is1Month) m1 += s.total;
            if (is3Month) m3 += s.total;

            if (s.items) {
                s.items.forEach(i => {
                    if (!itemPerf[i.name]) itemPerf[i.name] = { rev: 0, profit: 0 };
                    itemPerf[i.name].rev += (i.price * i.qty);
                    let buyPrice = i.buy_price;
                    if (!buyPrice) {
                        const st = stock.find(x => x.id === i.itemId);
                        buyPrice = st ? st.buy_price : 0;
                    }
                    const profit = (i.price - buyPrice) * i.qty;
                    itemPerf[i.name].profit += profit;
                    if (is1Month) profit1 += profit;
                    if (is3Month) profit3 += profit;
                });
            }
        });

        const lowStock = stock.filter(i => i.qty < 10).length;
        const stockValue = stock.reduce((acc, it) => acc + ((it.buy_price || 0) * (it.qty || 0)), 0);

        const fmt = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('ph-today-sales').textContent = fmt(today);
        // Show Revenue and Items sold breakdown for weekly/monthly
        const weeklyItems = sales.filter(s => new Date(s.date) >= startOfWeek).reduce((acc, s) => acc + (s.items ? s.items.reduce((a,i)=>a + (i.qty||0),0) : 0), 0);
        const monthlyItems = sales.filter(s => new Date(s.date) >= startOfMonth).reduce((acc, s) => acc + (s.items ? s.items.reduce((a,i)=>a + (i.qty||0),0) : 0), 0);
        const wkEl = document.getElementById('ph-weekly-sales');
        if (wkEl) wkEl.innerHTML = `<div style="font-size:0.9rem">Revenue: <strong>${fmt(weekly)}</strong></div><div style="font-size:0.9rem">Items: <strong>${weeklyItems}</strong></div>`;
        const moEl = document.getElementById('ph-monthly-sales');
        if (moEl) moEl.innerHTML = `<div style="font-size:0.9rem">Revenue: <strong>${fmt(monthly)}</strong></div><div style="font-size:0.9rem">Items: <strong>${monthlyItems}</strong></div>`;
        if (document.getElementById('ph-1m-sales')) document.getElementById('ph-1m-sales').textContent = fmt(m1);
        if (document.getElementById('ph-3m-sales')) document.getElementById('ph-3m-sales').textContent = fmt(m3);
        document.getElementById('ph-low-stock').textContent = lowStock;
        if (document.getElementById('ph-1m-profit')) document.getElementById('ph-1m-profit').textContent = fmt(profit1);
        if (document.getElementById('ph-3m-profit')) document.getElementById('ph-3m-profit').textContent = fmt(profit3);
        if (document.getElementById('ph-stock-value')) document.getElementById('ph-stock-value').textContent = fmt(stockValue);

        this.renderProfitChart(itemPerf);
    }

    renderProfitChart(data) {
        const container = document.getElementById('ph-profit-chart');
        if (!container) return;

        const items = Object.entries(data).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5); // Top 5
        if (items.length === 0) return;

        container.innerHTML = '';

        // Find max for scaling
        const maxVal = Math.max(...items.map(i => i[1].rev));

        items.forEach(([name, metrics]) => {
            const hRev = (metrics.rev / maxVal) * 100;
            const hProf = (metrics.profit / maxVal) * 100;

            // Render a group with two bars (Revenue & Profit)
            const html = `
                <div class="bar-group" style="width: 60px; margin: 0 10px;">
                    <div style="display:flex; align-items:flex-end; height:80%; gap:4px; width:100%">
                         <div class="bar blue" style="height: ${hRev}%" title="Revenue: $${metrics.rev.toFixed(0)}"></div>
                         <div class="bar green" style="height: ${hProf}%" title="Profit: $${metrics.profit.toFixed(0)}"></div>
                    </div>
                    <label style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:60px;">${name}</label>
                </div>
            `;
            container.innerHTML += html;
        });

        // Legend
        const legend = `<div style="position:absolute; top:10px; right:10px; font-size:0.8rem;">
            <span style="color:var(--primary)">■ Rev</span> <span style="color:var(--success)">■ Profit</span>
        </div>`;
        container.style.position = 'relative';
        container.innerHTML += legend;
    }

    // --- POS ---
    initPOS() {
        this.updatePosSelect();
        this.renderCart();

        document.getElementById('add-btn').onclick = () => this.addToCart();
        document.getElementById('checkout-btn').onclick = () => this.checkout();
    }

    updatePosSelect() {
        const items = window.Store.get(this.stockKey) || [];
        const select = document.getElementById('pos-item-select');
        select.innerHTML = '<option value="">-- Select Item --</option>';
        items.forEach(i => {
            const disabled = i.qty <= 0 ? 'disabled' : '';
            // Default sell price logic if missing (migration)
            const sellPrice = i.sell_price || (i.buy_price * 1.5);
            let unitLabel = '';
            if (i.unit_type === 'box') {
                unitLabel = `${Math.floor(i.qty / (i.pieces_per_box || 1))} boxes (${i.qty} pcs)`;
            } else if (i.unit_type === 'liquid') {
                unitLabel = `${i.qty} L`;
            } else {
                unitLabel = `${i.qty} pcs`;
            }
            const label = i.qty <= 0 ? `${i.name} (Out of Stock)` : `${i.name} ($${sellPrice.toFixed(2)}) - ${unitLabel}`;
            select.innerHTML += `<option value="${i.id}" data-price="${sellPrice}" ${disabled}>${label}</option>`;
        });
        // Show details when selection changes
        select.onchange = () => {
            const info = document.getElementById('pos-item-info');
            const id = parseInt(select.value);
            if (!id) { if (info) info.textContent = 'Select an item to see details'; return; }
            const it = items.find(x => x.id === id);
            if (!it) { if (info) info.textContent = 'Item not found'; return; }
            const unit = it.unit_type === 'box' ? `${Math.floor(it.qty / (it.pieces_per_box||1))} boxes (${it.qty} pcs)` : (it.unit_type === 'liquid' ? `${it.qty} L` : `${it.qty} pcs`);
            if (info) info.textContent = `${it.name} — ${unit} — Exp: ${it.expiry_date || '-'} `;
        };
    }

    addToCart() {
        const select = document.getElementById('pos-item-select');
        const qtyInput = document.getElementById('pos-qty');
        const qtyUnitSel = document.getElementById('pos-qty-unit');
        const itemId = parseInt(select.value);
        const rawQty = parseFloat(qtyInput.value);
        const qtyUnit = qtyUnitSel ? qtyUnitSel.value : 'base';
        let qty = parseInt(rawQty);

        if (!itemId || qty <= 0) { alert('Invalid Item/Qty'); return; }

        const items = window.Store.get(this.stockKey);
        const stockItem = items.find(i => i.id === itemId);

        // Convert boxes input to base pieces if needed
        let displayQty = qty; // what user entered
        if (qtyUnit === 'boxes' && stockItem.unit_type === 'box') {
            const ppb = stockItem.pieces_per_box || 1;
            qty = qty * ppb; // base qty to deduct
        }

        if (stockItem.qty < qty) { alert('Insufficient Stock!'); return; }

        const existing = this.cart.find(c => c.itemId === itemId);
        if (existing) {
            if (existing.qty + qty > stockItem.qty) { alert('Exceeds Stock'); return; }
            // Merge quantities. If units match, preserve orig_qty; otherwise drop orig display
            if (existing.orig_unit && existing.orig_unit === (qtyUnit === 'boxes' ? 'box' : (stockItem.unit_type === 'liquid' ? 'L' : 'pcs'))) {
                existing.orig_qty = (existing.orig_qty || 0) + displayQty;
            } else {
                // multiple unit types merged — clear orig display to avoid confusion
                existing.orig_qty = null;
                existing.orig_unit = null;
            }
            existing.qty += qty;
        } else {
            // Price is from data-price attribute which we set in updatePosSelect
            // But better to get authoritative price from stockItem
            const sellPrice = stockItem.sell_price || (stockItem.buy_price * 1.5);
            const origUnit = qtyUnit === 'boxes' ? 'box' : (stockItem.unit_type === 'liquid' ? 'L' : 'pcs');
            this.cart.push({ itemId, name: stockItem.name, qty, price: sellPrice, buy_price: stockItem.buy_price, unit_type: stockItem.unit_type, orig_qty: displayQty, orig_unit: origUnit, description: stockItem.description || '' });
        }
        this.renderCart();
        qtyInput.value = 1;
        select.value = '';
    }

    renderCart() {
        const list = document.getElementById('pos-cart-list');
        const totalEl = document.getElementById('pos-total');
        list.innerHTML = '';
        let total = 0;

        this.cart.forEach((item, idx) => {
            const itemTotal = item.qty * item.price;
            total += itemTotal;
            const dispQty = item.orig_qty ? `${item.orig_qty} ${item.orig_unit}` : (item.unit_type === 'liquid' ? `${item.qty} L` : `${item.qty} pcs`);
            const desc = item.description ? `<div style="color:#64748b; font-size:0.85rem">${item.description}</div>` : '';
            list.innerHTML += `<li><div><strong>${item.name}</strong> x${dispQty}${desc}</div><div>$${itemTotal.toFixed(2)} <button onclick="window.PharmacyModule.removeFromCart(${idx})" style="color:red;border:none;background:none;cursor:pointer">×</button></div></li>`;
        });
        totalEl.textContent = total.toFixed(2);
    }

    removeFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
    }

    checkout() {
        if (this.cart.length === 0) return;
        const sale = {
            items: this.cart.map(c => ({ itemId: c.itemId, name: c.name, qty: c.qty, orig_qty: c.orig_qty, orig_unit: c.orig_unit, price: c.price, buy_price: c.buy_price, unit_type: c.unit_type, description: c.description || '' })),
            total: this.cart.reduce((a, c) => a + (c.qty * c.price), 0),
            date: new Date().toISOString(),
            user: (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser.username : 'unknown'
        };
        window.Store.add(this.salesKey, sale);

        const stock = window.Store.get(this.stockKey);
        this.cart.forEach(cartItem => {
            const stockItem = stock.find(i => i.id === cartItem.itemId);
            if (stockItem) stockItem.qty -= cartItem.qty;
        });
        window.Store.set(this.stockKey, stock);

        // Log the activity
        const actionType = 'Create';
        const moduleName = 'pharmacy';
        const details = `Sale completed: $${sale.total.toFixed(2)} - ${sale.items.length} item(s)`;
        window.Store.logActivity(actionType, moduleName, details);

        this.cart = [];
        this.renderCart();
        this.updatePosSelect();
        alert('Sale Completed!');
    }

    // --- Stock ---
    initStock() {
        this.renderStockList();

        // Modal logic moved to page or handled here? 
        // Let's assume the page has the modal HTML and we just bind events
        window.openStockModal = (id) => this.openStockModal(id);
    }

    renderStockList() {
        const items = window.Store.get(this.stockKey) || [];
        const tbody = document.getElementById('pharmacy-stock-body');
        tbody.innerHTML = '';
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        items.forEach(item => {
            const tr = document.createElement('tr');
            // Check if item expires within 30 days
            if (item.expiry_date) {
                const expiryDate = new Date(item.expiry_date);
                if (expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
                    tr.classList.add('expiring-soon');
                }
            }
            // Migration: if sell_price missing, show calc
            const sell = item.sell_price || (item.buy_price * 1.5);
            let unitInfo = '';
            if (item.unit_type === 'box') unitInfo = `${Math.floor(item.qty / (item.pieces_per_box || 1))} boxes (${item.qty} pcs)`;
            else if (item.unit_type === 'liquid') unitInfo = `${item.qty} L`;
            else unitInfo = `${item.qty} pcs`;
            const unitDisplay = item.unit_type === 'pcs' ? 'Pieces' : item.unit_type === 'box' ? 'Box' : item.unit_type === 'liquid' ? 'Liters' : item.unit_type;
            const batchDisplay = item.batch || '-';
            const manuf = item.manuf_date || '-';
            const exp = item.expiry_date || '-';
            const desc = item.description ? (item.description.length>60? item.description.slice(0,60)+'...':item.description) : '-';
            const currentUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
            const isAdmin = currentUser && currentUser.role === 'admin';
            const actionBtn = isAdmin ? `<button class="btn-secondary" onclick="window.openStockModal(${item.id})">Edit</button>` : `<button class="btn-secondary" onclick="window.openStockModal(${item.id})">Add Qty</button>`;
            tr.innerHTML = `<td>${item.id}</td><td>${item.name}</td><td>${desc}</td><td>${(item.buy_price||0).toFixed(2)}</td><td>${sell.toFixed(2)}</td><td>${unitInfo}</td><td>${unitDisplay}</td><td>${batchDisplay}</td><td>${manuf}</td><td>${exp}</td><td>${actionBtn}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    openStockModal(itemId) {
        const items = window.Store.get(this.stockKey) || [];
        const item = itemId ? items.find(i => i.id === itemId) : null;
        const modal = document.getElementById('modal-container');

        document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'New Item';
        document.getElementById('st-id').value = item ? item.id : '';
        document.getElementById('st-name').value = item ? item.name : '';
        document.getElementById('st-price').value = item ? item.buy_price : '';
        document.getElementById('st-sell-price').value = item ? (item.sell_price || (item.buy_price * 1.5)) : '';
        document.getElementById('st-unit-type').value = item ? (item.unit_type || 'pcs') : 'pcs';
        document.getElementById('st-pieces-per-box').value = item ? (item.pieces_per_box || 1) : 1;
        document.getElementById('st-qty').value = 0; // default to add 0
        document.getElementById('st-qty-unit').value = 'base';
        document.getElementById('st-batch').value = item ? (item.batch || '') : '';
        document.getElementById('st-manuf').value = item ? (item.manuf_date || '') : '';
        document.getElementById('st-expiry').value = item ? (item.expiry_date || '') : '';
        // description field
        const descEl = document.getElementById('st-description');
        if (descEl) descEl.value = item ? (item.description || '') : '';

        modal.classList.remove('hidden');
        modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');

        // Toggle pieces-per-box visibility based on unit type
        const unitSelect = document.getElementById('st-unit-type');
        const ppbRow = document.getElementById('pieces-per-box-row');
        const togglePpb = () => { if (unitSelect.value === 'box') ppbRow.style.display = 'block'; else ppbRow.style.display = 'none'; };
        togglePpb();
        unitSelect.onchange = togglePpb;

        // Disable fields for non-admin users (they may only add qty)
        const currentUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
        const isAdmin = currentUser && currentUser.role === 'admin';
        document.getElementById('st-name').disabled = !isAdmin;
        document.getElementById('st-price').disabled = !isAdmin;
        document.getElementById('st-sell-price').disabled = !isAdmin;
        document.getElementById('st-unit-type').disabled = !isAdmin;
        document.getElementById('st-pieces-per-box').disabled = !isAdmin;
        document.getElementById('st-batch').disabled = !isAdmin;
        document.getElementById('st-manuf').disabled = !isAdmin;
        document.getElementById('st-expiry').disabled = !isAdmin;
        if (document.getElementById('st-description')) document.getElementById('st-description').disabled = !isAdmin;

        document.getElementById('stock-form').onsubmit = (e) => {
            e.preventDefault();
            const fd = {
                id: document.getElementById('st-id').value,
                name: document.getElementById('st-name').value,
                description: document.getElementById('st-description') ? document.getElementById('st-description').value : '',
                price: parseFloat(document.getElementById('st-price').value),
                sell_price: parseFloat(document.getElementById('st-sell-price').value),
                unit_type: document.getElementById('st-unit-type').value,
                pieces_per_box: parseInt(document.getElementById('st-pieces-per-box').value) || 1,
                batch: document.getElementById('st-batch').value || '',
                qty: parseFloat(document.getElementById('st-qty').value) || 0,
                qty_unit: document.getElementById('st-qty-unit').value,
                manuf_date: document.getElementById('st-manuf').value,
                expiry_date: document.getElementById('st-expiry').value
            };
            this.saveStockItem(fd, item);
            modal.classList.add('hidden');
        };
    }

    saveStockItem(formData, originalItem) {
        let items = window.Store.get(this.stockKey) || [];
        const currentUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (originalItem) {
            const idx = items.findIndex(i => i.id == originalItem.id);
            if (idx !== -1) {
                // Non-admin can only add qty; admin can edit details
                if (isAdmin) {
                    items[idx].name = formData.name;
                    items[idx].description = formData.description || items[idx].description || '';
                    items[idx].buy_price = formData.price;
                    items[idx].sell_price = formData.sell_price;
                    items[idx].unit_type = formData.unit_type;
                    items[idx].pieces_per_box = formData.pieces_per_box;
                    items[idx].manuf_date = formData.manuf_date;
                    items[idx].expiry_date = formData.expiry_date;
                }
                // update batch
                if (isAdmin) items[idx].batch = formData.batch || items[idx].batch || '';
                // Calculate qty to add based on qty_unit
                let addQty = formData.qty || 0;
                if (formData.qty_unit === 'boxes' && items[idx].unit_type === 'box') {
                    addQty = (formData.qty || 0) * (formData.pieces_per_box || items[idx].pieces_per_box || 1);
                }
                items[idx].qty = (items[idx].qty || 0) + addQty;
            }
        } else {
            // Only admin can create new items
            if (!isAdmin) {
                alert('Only admin can create new items');
                return;
            }
            // Convert qty if given in boxes
            let baseQty = formData.qty || 0;
            if (formData.qty_unit === 'boxes' && formData.unit_type === 'box') {
                baseQty = (formData.qty || 0) * (formData.pieces_per_box || 1);
            }
            const newItem = { name: formData.name, description: formData.description || '', buy_price: formData.price, sell_price: formData.sell_price, qty: baseQty, unit_type: formData.unit_type || 'pcs', pieces_per_box: formData.pieces_per_box || 1, batch: formData.batch || '', manuf_date: formData.manuf_date || '', expiry_date: formData.expiry_date || '' };
            window.Store.add(this.stockKey, newItem);
            items = window.Store.get(this.stockKey);
        }
        window.Store.set(this.stockKey, items);
        this.renderStockList();
    }

    initRecords() {
        const sales = window.Store.get(this.salesKey) || [];
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';
        sales.sort((a, b) => new Date(b.date) - new Date(a.date));
        sales.forEach(s => {
            const tr = document.createElement('tr');
            const itemsDesc = s.items.map(i => {
                const unit = i.orig_unit || (i.unit_type === 'liquid' ? 'L' : 'pcs');
                const q = (i.orig_qty !== undefined && i.orig_qty !== null) ? i.orig_qty : i.qty;
                const extra = i.description ? ` — ${i.description}` : '';
                return `${i.name} (${q} ${unit})${extra}`;
            }).join(', ');
            tr.innerHTML = `<td>${new Date(s.date).toLocaleString()}</td><td>${itemsDesc}</td><td>${s.total.toFixed(2)}</td><td>${s.user||''}</td>`;
            tbody.appendChild(tr);
        });
    }
}
window.PharmacyModule = new PharmacyModule();
