/**
 * Exchange.js V2
 * Money Exchange Module with Multi-View Support
 */

class ExchangeModule {
    constructor() {
        this.storeKey = 'exchange_transactions';
        this.initForms();
    }

    onViewLoad(action) {
        // Called by App.js when navigating to exchange-[action]
        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'buy':
                this.renderForm('buy');
                break;
            case 'sell':
                this.renderForm('sell');
                break;
            case 'records':
                this.renderRecords();
                break;
        }
    }

    // --- Dashboard ---
    renderDashboard() {
        this.updateStats();
    }

    updateStats() {
        const transactions = window.Store.get(this.storeKey) || [];

        // Calculate totals by type and currency
        const stats = {
            buy: { USD: 0, EUR: 0, GBP: 0 },
            sell: { USD: 0, EUR: 0, GBP: 0 }
        };

        let totalVol = 0;

        transactions.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const rate = parseFloat(tx.rate) || 0;

            if (stats[tx.type] && stats[tx.type][tx.currency] !== undefined) {
                stats[tx.type][tx.currency] += amt;
            }
            totalVol += (amt * rate);
        });

        // Update Module Dashboard DOM
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString();
        };

        setTxt('ex-buy-usd', stats.buy.USD.toFixed(2));
        setTxt('ex-sell-usd', stats.sell.USD.toFixed(2));
        setTxt('ex-buy-eur', stats.buy.EUR.toFixed(2));
        setTxt('ex-sell-eur', stats.sell.EUR.toFixed(2));

        // Update Global Stat
        const globalEl = document.getElementById('stat-exchange');
        if (globalEl) globalEl.textContent = totalVol.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- Forms ---
    renderForm(type) {
        // Forms are static in HTML, but we can reset them or set default values here
        const formId = `exchange-${type}-form`;
        const container = document.getElementById(formId);
        if (!container.innerHTML.trim()) {
            // Inject Form HTML if empty
            container.innerHTML = `
                <div class="form-group">
                    <label>Customer Name</label>
                    <input type="text" name="customer" required placeholder="e.g. John Doe">
                </div>
                <div class="form-group">
                    <label>Currency</label>
                    <select name="currency">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (Foreign Currency)</label>
                    <input type="number" name="amount" required step="0.01">
                </div>
                <div class="form-group">
                    <label>Exchange Rate</label>
                    <input type="number" name="rate" required step="0.0001">
                </div>
                <div class="form-group">
                    <label>Total (Local Currency)</label>
                    <input type="text" name="total" readonly>
                </div>
                <button type="submit" class="btn-primary">Record Transaction</button>
            `;

            // Attach Auto-Calc listeners
            const form = document.getElementById(formId);
            const calc = () => {
                const amt = parseFloat(form.amount.value) || 0;
                const rate = parseFloat(form.rate.value) || 0;
                form.total.value = (amt * rate).toFixed(2);
            };
            form.amount.addEventListener('input', calc);
            form.rate.addEventListener('input', calc);

            // Attach Submit Listener
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTransaction({
                    type: type,
                    customer: form.customer.value,
                    currency: form.currency.value,
                    amount: parseFloat(form.amount.value),
                    rate: parseFloat(form.rate.value)
                });
                form.reset();
            });
        }
    }

    initForms() {
        // Can pre-render or wait for init
    }

    saveTransaction(data) {
        window.Store.add(this.storeKey, data);
        alert('Transaction Saved Successfully!');
        // Optionally redirect to records or dashboard
        // window.App.navigateTo('exchange-records');
    }

    // --- Records ---
    renderRecords() {
        const transactions = window.Store.get(this.storeKey) || [];
        const tbody = document.getElementById('exchange-records-body');
        tbody.innerHTML = '';

        // Sort by date desc
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleString()}</td>
                <td><span style="font-weight:bold; color:${tx.type === 'buy' ? 'green' : 'red'}">${tx.type.toUpperCase()}</span></td>
                <td>${tx.customer}</td>
                <td>${tx.currency}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>${tx.rate.toFixed(4)}</td>
                <td>${(tx.amount * tx.rate).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.ExchangeModule = new ExchangeModule();
