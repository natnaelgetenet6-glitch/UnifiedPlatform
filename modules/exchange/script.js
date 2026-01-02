/**
 * Exchange Module Script
 */
class ExchangeModule {
    constructor() {
        this.storeKey = 'exchange_transactions';
        this.holdingsKey = 'exchange_holdings';
        this.ratesKey = 'exchange_rates';
    }

    initDashboard() {
        const transactions = window.Store.get(this.storeKey) || [];
        const storedHoldings = window.Store.get(this.holdingsKey) || null;

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        let volWeek = 0, volMonth = 0;
        let estimatedProfit = 0;

        const curVol = {}; // { USD: 0, EUR: 0 }

        // existing buy/sell stats (track per-currency dynamically)
        const stats = { buy: {}, sell: {} };

        // Profit Logic: Track Weighted Avg Buy Rate
        // Prefer lot-based holdings if available (storedHoldings)
        const holdings = {};
        let lotsByCur = null;
        if (storedHoldings) {
            lotsByCur = {};
            Object.entries(storedHoldings).forEach(([cur, data]) => {
                lotsByCur[cur] = (data.lots || []).map(l => ({ amount: l.amount, rate: l.rate, date: l.date }));
            });
        }

        // Sort by date ascending to calculate profit over time correctly
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTx.forEach(tx => {
            // If we have stored lot holdings, realize profit using FIFO lots
            if (lotsByCur) {
                if (!lotsByCur[tx.currency]) lotsByCur[tx.currency] = [];
                if (tx.type === 'buy') {
                    lotsByCur[tx.currency].push({ amount: tx.amount, rate: tx.rate, date: tx.date });
                    stats.buy[tx.currency] = (stats.buy[tx.currency] || 0) + tx.amount;
                } else if (tx.type === 'sell') {
                    let remaining = tx.amount;
                    while (remaining > 0 && lotsByCur[tx.currency].length > 0) {
                        const lot = lotsByCur[tx.currency][0];
                        const take = Math.min(remaining, lot.amount);
                        estimatedProfit += (tx.rate - lot.rate) * take;
                        lot.amount -= take;
                        remaining -= take;
                        if (lot.amount <= 0) lotsByCur[tx.currency].shift();
                    }
                    if (remaining > 0) {
                        // sold more than known lots — assume zero cost for remainder
                        estimatedProfit += tx.rate * remaining;
                    }
                    stats.sell[tx.currency] = (stats.sell[tx.currency] || 0) + tx.amount;
                }
            } else {
                if (!holdings[tx.currency]) holdings[tx.currency] = { totalAmt: 0, totalCost: 0, avgRate: 0 };
                const h = holdings[tx.currency];

                if (tx.type === 'buy') {
                    // Update Weighted Avg
                    h.totalAmt += tx.amount;
                    h.totalCost += (tx.amount * tx.rate);
                    h.avgRate = h.totalCost / h.totalAmt;

                    // Dashboard Stats
                    stats.buy[tx.currency] = (stats.buy[tx.currency] || 0) + tx.amount;

                } else if (tx.type === 'sell') {
                    // Realize Profit
                    const costRate = h.avgRate || tx.rate;
                    const profit = (tx.rate - costRate) * tx.amount;
                    estimatedProfit += profit;

                    h.totalAmt -= tx.amount;
                    h.totalCost -= (tx.amount * costRate); // Reduce cost basis

                    // Dashboard Stats
                    stats.sell[tx.currency] = (stats.sell[tx.currency] || 0) + tx.amount;
                }
            }

            // Volume Stats (Date Based on original unsorted? No, we need date check)
            // But we are in a sorted loop.
            const val = tx.amount * tx.rate;
            const d = new Date(tx.date);

            if (d >= startOfWeek) volWeek += val;
            if (d >= startOfMonth) volMonth += val;

            if (!curVol[tx.currency]) curVol[tx.currency] = 0;
            curVol[tx.currency] += val;
        });

        const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtCur = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

        // Update DOM
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        setTxt('ex-buy-usd', fmt(stats.buy.USD || 0));
        setTxt('ex-sell-usd', fmt(stats.sell.USD || 0));
        setTxt('ex-buy-eur', fmt(stats.buy.EUR || 0));
        setTxt('ex-sell-eur', fmt(stats.sell.EUR || 0));

        // New Weekly/Monthly — show buy vs sell breakdown
        const volWeekBuy = sortedTx.filter(t => new Date(t.date) >= startOfWeek && t.type === 'buy').reduce((s,t) => s + (t.amount * t.rate), 0);
        const volWeekSell = sortedTx.filter(t => new Date(t.date) >= startOfWeek && t.type === 'sell').reduce((s,t) => s + (t.amount * t.rate), 0);
        const volMonthBuy = sortedTx.filter(t => new Date(t.date) >= startOfMonth && t.type === 'buy').reduce((s,t) => s + (t.amount * t.rate), 0);
        const volMonthSell = sortedTx.filter(t => new Date(t.date) >= startOfMonth && t.type === 'sell').reduce((s,t) => s + (t.amount * t.rate), 0);

        const elWeek = document.getElementById('ex-vol-week');
        if (elWeek) elWeek.innerHTML = `<div style="font-size:0.9rem">Buy: <strong>${fmtCur(volWeekBuy)}</strong></div><div style="font-size:0.9rem">Sell: <strong>${fmtCur(volWeekSell)}</strong></div>`;
        const elMonth = document.getElementById('ex-vol-month');
        if (elMonth) elMonth.innerHTML = `<div style="font-size:0.9rem">Buy: <strong>${fmtCur(volMonthBuy)}</strong></div><div style="font-size:0.9rem">Sell: <strong>${fmtCur(volMonthSell)}</strong></div>`;
        setTxt('ex-profit', fmtCur(estimatedProfit));

        this.renderVolChart(curVol);
    }

    renderVolChart(data) {
        const container = document.getElementById('ex-vol-chart');
        if (!container) return;

        const items = Object.entries(data).sort((a, b) => b[1] - a[1]);
        if (items.length === 0) { container.innerHTML = '<p style="text-align:center;width:100%;color:#ccc">No Data</p>'; return; }

        container.innerHTML = '';
        const max = Math.max(...items.map(i => i[1]));

        items.forEach(([cur, vol]) => {
            const h = (vol / max) * 100;
            container.innerHTML += `
                <div class="bar-group" style="width:60px; margin:0 15px;">
                    <div class="bar orange" style="height:${h}%" title="${vol.toFixed(0)}"></div>
                    <label>${cur}</label>
                </div>
            `;
        });
    }

    initForm(type) {
        const form = document.querySelector('form');
        if (!form) return;

        // Populate currency dropdown from admin rates settings (supports buy_rate and sell_rate)
        const rates = window.Store.get(this.ratesKey) || null;
        const currencySelect = form.querySelector('select[name="currency"]');
        if (currencySelect) {
            currencySelect.innerHTML = '';
            if (rates && Object.keys(rates).length > 0) {
                Object.keys(rates).forEach(cur => {
                    const opt = document.createElement('option');
                    opt.value = cur;
                    opt.textContent = cur;
                    currencySelect.appendChild(opt);
                });
            } else {
                // fallback defaults
                ['USD','EUR','GBP'].forEach(cur => {
                    const opt = document.createElement('option'); opt.value = cur; opt.textContent = cur; currencySelect.appendChild(opt);
                });
            }

            // when a currency is selected update rate input with current configured rate
            const amountEl = form.querySelector('input[name="amount"]');
            const rateEl = form.querySelector('input[name="rate"]');
            const totalEl = form.querySelector('input[name="total"]');

            const updateRateFromConfig = (sel) => {
                const cfg = (window.Store.get(this.ratesKey) || {})[sel] || {};
                if (cfg && rateEl) {
                    rateEl.value = (type === 'buy' ? (cfg.buy_rate || cfg.rate) : (cfg.sell_rate || cfg.rate)) || '';
                    const badge = document.getElementById('configured-rate-badge');
                    if (badge) badge.textContent = `Configured: ${((type==='buy'?cfg.buy_rate:cfg.sell_rate)||cfg.rate||0).toFixed(4)}`;
                }
                // recalc totals after programmatic rate change
                if (typeof calc === 'function') calc();
            };

            currencySelect.addEventListener('change', () => {
                updateRateFromConfig(currencySelect.value);
            });

            // set initial rate and badge
            const initCfg = (window.Store.get(this.ratesKey) || {})[currencySelect.value] || {};
            if (initCfg && rateEl) rateEl.value = (type === 'buy' ? (initCfg.buy_rate || initCfg.rate) : (initCfg.sell_rate || initCfg.rate)) || '';
            const badgeInit = document.getElementById('configured-rate-badge');
            if (badgeInit) badgeInit.textContent = `Configured: ${((type==='buy'?initCfg.buy_rate:initCfg.sell_rate)||initCfg.rate||0).toFixed(4)}`;
            // ensure initial calc
            if (typeof calc === 'function') setTimeout(() => { try { calc(); } catch(e){} }, 0);
        }

        // Rate edit permission: only admin can change the rate
        const currentUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
        const isAdmin = currentUser && currentUser.role === 'admin';
        const rateInput = form.querySelector('input[name="rate"]');
        if (rateInput && !isAdmin) {
            rateInput.readOnly = true;
            rateInput.title = 'Rate editable by admin only';
            rateInput.style.background = '#f8fafc';
        }

        // If admin edits the rate in the buy/sell form, persist it to the admin-configured rates
        if (rateInput && isAdmin) {
            const persistRate = () => {
                const cur = form.currency ? form.currency.value : null;
                const newRate = parseFloat(rateInput.value);
                if (!cur || isNaN(newRate)) return;
                const rates = window.Store.get(this.ratesKey) || {};
                rates[cur] = rates[cur] || { created: new Date().toISOString() };
                // store separately for buy and sell
                if (type === 'buy') rates[cur].buy_rate = newRate;
                else if (type === 'sell') rates[cur].sell_rate = newRate;
                // keep a fallback generic rate for backward compatibility
                rates[cur].rate = newRate;
                rates[cur].updated = new Date().toISOString();
                window.Store.set(this.ratesKey, rates);
                const badge = document.getElementById('configured-rate-badge'); if (badge) badge.textContent = `Configured: ${newRate.toFixed(4)}`;
                // ensure totals reflect programmatic/admin rate change
                try { if (typeof calc === 'function') calc(); } catch (e) {}
            };
            rateInput.addEventListener('change', persistRate);
            rateInput.addEventListener('blur', persistRate);
        }

        // Auto Calc
        const calc = () => {
            const amt = parseFloat((amountEl && amountEl.value) || 0) || 0;
            const rate = parseFloat((rateEl && rateEl.value) || 0) || 0;
            if (totalEl) totalEl.value = (amt * rate).toFixed(2);
        };
        if (amountEl) amountEl.addEventListener('input', calc);
        if (rateEl) rateEl.addEventListener('input', calc);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const currency = form.currency.value;
            const amount = parseFloat((amountEl && amountEl.value) || (form.amount && form.amount.value) || 0);

            if (type === 'sell') {
                const transactions = window.Store.get(this.storeKey) || [];
                const netHolding = transactions.reduce((acc, tx) => {
                    if (tx.currency === currency) {
                        return acc + (tx.type === 'buy' ? tx.amount : -tx.amount);
                    }
                    return acc;
                }, 0);

                if (amount > netHolding) {
                    alert(`Insufficient funds! You only have ${netHolding.toFixed(2)} ${currency} in holdings.`);
                    return;
                }
            }

            const data = {
                type: type,
                customer: form.customer.value,
                id_card: form.id_card ? form.id_card.value : '',
                currency: currency,
                amount: amount,
                rate: parseFloat((rateEl && rateEl.value) || (form.rate && form.rate.value) || 0),
                date: new Date().toISOString()
            };

            // Persist transaction and update lot-based holdings (FIFO)
            const saved = window.Store.add(this.storeKey, data);

            // Log the activity
            const actionType = 'Create';
            const moduleName = 'exchange';
            const details = `${type.toUpperCase()} ${amount} ${currency} at rate ${data.rate}`;
            window.Store.logActivity(actionType, moduleName, details);

            // Load or init holdings map
            const holdings = window.Store.get(this.holdingsKey) || {};
            if (type === 'buy') {
                if (!holdings[currency]) holdings[currency] = { lots: [] };
                holdings[currency].lots.push({ amount: amount, rate: data.rate, date: data.date });
                window.Store.set(this.holdingsKey, holdings);
            } else if (type === 'sell') {
                if (!holdings[currency]) holdings[currency] = { lots: [] };
                let remaining = amount;
                const realized = [];
                while (remaining > 0 && holdings[currency].lots.length > 0) {
                    const lot = holdings[currency].lots[0];
                    const take = Math.min(remaining, lot.amount);
                    realized.push({ amount: take, buy_rate: lot.rate });
                    lot.amount -= take;
                    remaining -= take;
                    if (lot.amount <= 0) holdings[currency].lots.shift();
                }
                // Save adjusted holdings
                window.Store.set(this.holdingsKey, holdings);

                // Attach realized lot info to saved transaction for auditing
                const all = window.Store.get(this.storeKey) || [];
                const tx = all.find(t => t.date === saved.date && t.currency === saved.currency && t.amount === saved.amount && t.type === saved.type);
                if (tx) { tx.realized = realized; window.Store.set(this.storeKey, all); }
            }

            // Ask to print receipt
            const all = window.Store.get(this.storeKey) || [];
            const savedTx = all.find(t => t.id === (saved && saved.id)) || saved;
            const pr = await window.UI.confirm({ title: 'Transaction Saved', message: 'Transaction saved. Print receipt?', confirmText: 'Print', cancelText: 'Close', allowInput: false });
            if (pr && pr.confirmed) {
                window.UI.printReceipt.transaction(savedTx || saved || data);
            }
            form.reset();
        });
    }

    // ---- Exchange Rates Management (Admin) ----
    getRates() {
        return window.Store.get(this.ratesKey) || {};
    }

    setRates(rates) {
        window.Store.set(this.ratesKey, rates);
    }

    initManage() {
        // Admin page to add/update currencies and rates
        const form = document.querySelector('#rates-form');
        const tbody = document.querySelector('#rates-body');
        if (!form || !tbody) return;

        const render = () => {
            const rates = this.getRates();
            tbody.innerHTML = '';
            Object.entries(rates).forEach(([cur, data]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cur}</td>
                    <td>${((data.buy_rate||data.rate)||0).toFixed(4)}</td>
                    <td>${((data.sell_rate||data.rate)||0).toFixed(4)}</td>
                    <td>${new Date(data.updated||data.created||'').toLocaleString()||''}</td>
                    <td>
                        <button class="btn-secondary edit-rate" data-cur="${cur}">Edit</button>
                        <button class="btn-danger delete-rate" data-cur="${cur}">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        };

        render();

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const cur = form.currency.value.trim().toUpperCase();
            const buy = parseFloat(form.buy_rate.value);
            const sell = parseFloat(form.sell_rate.value);
            if (!cur || (isNaN(buy) && isNaN(sell))) { alert('Provide valid currency and at least one rate'); return; }
            const rates = this.getRates();
            rates[cur] = rates[cur] || { created: new Date().toISOString() };
            if (!isNaN(buy)) rates[cur].buy_rate = buy;
            if (!isNaN(sell)) rates[cur].sell_rate = sell;
            // keep fallback generic rate for compatibility
            rates[cur].rate = !isNaN(buy) ? buy : ( !isNaN(sell) ? sell : (rates[cur].rate || 0) );
            rates[cur].updated = new Date().toISOString();
            this.setRates(rates);
            form.currency.value = '';
            form.buy_rate.value = '';
            form.sell_rate.value = '';
            render();
        });

        // delegate edit/delete
        tbody.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            const cur = btn.dataset.cur;
            if (btn.classList.contains('edit-rate')) {
                const rates = this.getRates();
                const data = rates[cur] || {};
                if (!data) return;
                // populate form for edit
                form.currency.value = cur;
                form.buy_rate.value = data.buy_rate || data.rate || '';
                form.sell_rate.value = data.sell_rate || data.rate || '';
            } else if (btn.classList.contains('delete-rate')) {
                if (!confirm(`Delete currency ${cur}?`)) return;
                const rates = this.getRates();
                delete rates[cur];
                this.setRates(rates);
                render();
            }
        });
    }

    initRecords() {
        const transactions = window.Store.get(this.storeKey) || [];
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleString()}</td>
                <td><span style="font-weight:bold; color:${tx.type === 'buy' ? 'green' : 'red'}">${tx.type.toUpperCase()}</span></td>
                <td>${tx.customer}</td>
                <td>${tx.id_card || ''}</td>
                <td>${tx.currency}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>${tx.rate.toFixed(4)}</td>
                <td>${(tx.amount * tx.rate).toFixed(2)}</td>
            `;
            // Actions column
            const actionsTd = document.createElement('td');
            if (tx.status === 'voided') {
                actionsTd.innerHTML = `<span style="color:#9ca3af;">Voided</span><div style="font-size:0.8rem;color:#6b7280">by: ${tx.voided_by||''}<br/>${tx.void_reason||''}</div>`;
            } else {
                actionsTd.innerHTML = `<button class="btn-danger" onclick="window.ExchangeModule.voidTransaction(${tx.id})">Void</button>`;
            }
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
        // Ensure table header has actions column (if present in DOM)
        const thead = document.querySelector('thead tr');
        if (thead && !thead.querySelector('.actions-header')) {
            const th = document.createElement('th'); th.className = 'actions-header'; th.textContent = 'Actions'; thead.appendChild(th);
        }
    }

    // Void a transaction: mark as voided and attempt to reverse holdings effects where possible
    async voidTransaction(id) {
        const res = await window.UI.confirm({ title: 'Void Transaction', message: 'Void this transaction? This will mark it as canceled but keep the record.', placeholder: 'Entry error', confirmText: 'Void', cancelText: 'Cancel', allowInput: true });
        if (!res || !res.confirmed) return;
        const reason = res.input || '';
        const tx = window.Store.voidItem(this.storeKey, id, reason);
        if (!tx) { alert('Transaction not found'); return; }

        // Attempt to reverse holdings adjustments
        const holdings = window.Store.get(this.holdingsKey) || {};
        holdings[tx.currency] = holdings[tx.currency] || { lots: [] };

        if (tx.type === 'buy') {
            // Remove lot corresponding to this buy (match by date/rate/amount if possible)
            let remaining = tx.amount;
            // Try to find exact lot
            const idx = holdings[tx.currency].lots.findIndex(l => l.amount === tx.amount && l.rate === tx.rate && l.date === tx.date);
            if (idx !== -1) {
                holdings[tx.currency].lots.splice(idx, 1);
            } else {
                // Otherwise, remove amount from the end (most recent) lots
                for (let i = holdings[tx.currency].lots.length - 1; i >= 0 && remaining > 0; i--) {
                    const lot = holdings[tx.currency].lots[i];
                    if (lot.amount <= remaining) {
                        remaining -= lot.amount; holdings[tx.currency].lots.splice(i, 1);
                    } else {
                        lot.amount -= remaining; remaining = 0;
                    }
                }
            }
        } else if (tx.type === 'sell') {
            // For sell reversal, if realized lot info exists, re-add those amounts back as lots
            if (tx.realized && Array.isArray(tx.realized)) {
                tx.realized.forEach(r => {
                    holdings[tx.currency].lots.unshift({ amount: r.amount, rate: r.buy_rate || r.rate || 0, date: new Date().toISOString() });
                });
            } else {
                // If no realized info, conservatively add a lot equal to amount at tx.rate (best-effort)
                holdings[tx.currency].lots.unshift({ amount: tx.amount, rate: tx.rate || 0, date: new Date().toISOString() });
            }
        }

        window.Store.set(this.holdingsKey, holdings);
        window.Store.logActivity('Void-Reverse', 'exchange', `Reversed holdings for tx id=${id}`);

        // Re-render views
        this.initRecords();
        this.initStock();
        alert('Transaction voided. Audit trail retained.');
    }
    initStock() {
        const transactions = window.Store.get(this.storeKey) || [];
        const tbody = document.getElementById('holdings-body');
        if (!tbody) return;

        const storedHoldings = window.Store.get(this.holdingsKey) || null;
        tbody.innerHTML = '';
        if (storedHoldings) {
            Object.entries(storedHoldings).forEach(([cur, data]) => {
                const total = (data.lots || []).reduce((s, l) => s + (l.amount || 0), 0);
                const avgBuy = (data.lots && data.lots.length) ? (data.lots.reduce((s, l) => s + ((l.amount || 0) * (l.rate || 0)), 0) / (total || 1)) : 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span style="font-weight:bold;">${cur}</span></td>
                    <td>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>-</td>
                    <td><span style="color:${total <= 0 ? 'red' : 'green'}; font-weight:bold;">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td>${avgBuy.toFixed(4)}</td>
                    <td>$${(total * avgBuy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td><button class="btn-secondary" onclick="window.ExchangeModule.showLots('${cur}')">View Lots</button></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            // fallback: aggregate from transactions
            const holdings = {};
            const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            sortedTx.forEach(tx => {
                if (!holdings[tx.currency]) holdings[tx.currency] = { bought: 0, sold: 0, net: 0, totalCost: 0 };
                const h = holdings[tx.currency];
                if (tx.type === 'buy') { h.bought += tx.amount; h.net += tx.amount; h.totalCost += tx.amount * tx.rate; }
                else if (tx.type === 'sell') { h.sold += tx.amount; h.net -= tx.amount; const avg = h.bought>0? h.totalCost/h.bought:0; h.totalCost -= tx.amount*avg; }
            });
            Object.entries(holdings).forEach(([cur, h]) => {
                const actualAvgBuy = h.bought > 0 ? (transactions.filter(t => t.type === 'buy' && t.currency === cur).reduce((s, t) => s + (t.amount * t.rate), 0) / h.bought) : 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span style="font-weight:bold;">${cur}</span></td>
                    <td>${h.bought.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${h.sold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td><span style="color:${h.net <= 0 ? 'red' : 'green'}; font-weight:bold;">${h.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td>${actualAvgBuy.toFixed(4)}</td>
                    <td>$${(h.net * actualAvgBuy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td><button class="btn-secondary" onclick="window.ExchangeModule.showLots('${cur}')">View Lots</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // ensure modal close handler
        const modal = document.getElementById('lots-modal');
        if (modal) modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    }

    showLots(currency) {
        const holdings = window.Store.get(this.holdingsKey) || {};
        const data = holdings[currency];
        const modal = document.getElementById('lots-modal');
        const body = document.getElementById('lots-modal-body');
        const title = document.getElementById('lots-modal-title');
        if (!modal || !body || !title) return;
        title.textContent = `Lot History — ${currency}`;
        body.innerHTML = '';

        if (!data || !data.lots || data.lots.length === 0) {
            body.innerHTML = '<p style="color:#64748b">No lot history for this currency.</p>';
            modal.classList.remove('hidden');
            return;
        }

        const tbl = document.createElement('table');
        tbl.className = 'data-table';
        tbl.innerHTML = `<thead><tr><th>Date</th><th>Amount</th><th>Buy Rate</th><th>Value (USD)</th></tr></thead>`;
        const tb = document.createElement('tbody');
        data.lots.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(l.date).toLocaleString()}</td><td>${(l.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td><td>${(l.rate||0).toFixed(4)}</td><td>$${((l.amount||0)*(l.rate||0)).toFixed(2)}</td>`;
            tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        body.appendChild(tbl);
        modal.classList.remove('hidden');
    }
}

window.ExchangeModule = new ExchangeModule();
