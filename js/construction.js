/**
 * Construction.js V2
 * Construction Management Module Multi-View
 */

class ConstructionModule {
    constructor() {
        this.expenseKey = 'construction_expenses';
        this.incomeKey = 'construction_income';
        this.initForms();
    }

    onViewLoad(action) {
        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'expense':
                // Form is static, maybe reset?
                break;
            case 'income':
                // Form is static
                break;
            case 'records':
                this.renderRecords();
                break;
        }
    }

    // --- Dashboard ---
    renderDashboard() {
        const expenses = window.Store.get(this.expenseKey) || [];
        const incomes = window.Store.get(this.incomeKey) || [];

        const totExp = expenses.reduce((a, c) => a + c.amount, 0);
        const totInc = incomes.reduce((a, c) => a + c.amount, 0);
        const bal = totInc - totExp;

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        };

        setTxt('cons-dash-expense', totExp);
        setTxt('cons-dash-income', totInc);
        setTxt('cons-dash-balance', bal);

        this.updateStats(); // Sync global
    }

    updateStats() {
        const expenses = window.Store.get(this.expenseKey) || [];
        const incomes = window.Store.get(this.incomeKey) || [];
        const totExp = expenses.reduce((a, c) => a + c.amount, 0);
        const totInc = incomes.reduce((a, c) => a + c.amount, 0);

        const el = document.getElementById('stat-construction');
        if (el) el.textContent = (totInc - totExp).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- Forms ---
    initForms() {
        const handleForm = (formId, type, key) => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();

                    // Fields: exp-desc or inc-desc (generic logic based on form)
                    const descId = type === 'expense' ? 'exp-desc' : 'inc-desc';
                    const amtId = type === 'expense' ? 'exp-amount' : 'inc-amount';
                    const dateId = type === 'expense' ? 'exp-date' : 'inc-date';

                    const data = {
                        description: document.getElementById(descId).value,
                        amount: parseFloat(document.getElementById(amtId).value),
                        date: document.getElementById(dateId).value, // YYYY-MM-DD
                        type: type
                    };

                    this.saveTransaction(key, data);
                    form.reset();
                    // Set date back to today
                    document.getElementById(dateId).value = new Date().toISOString().split('T')[0];
                });
            }
        };

        handleForm('construction-expense-form', 'expense', this.expenseKey);
        handleForm('construction-income-form', 'income', this.incomeKey);
    }

    saveTransaction(key, data) {
        // Fix date to ISO
        data.date = new Date(data.date).toISOString();
        window.Store.add(key, data);
        alert('Transaction Saved');
    }

    // --- Records ---
    renderRecords() {
        const expenses = (window.Store.get(this.expenseKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (window.Store.get(this.incomeKey) || []).map(i => ({ ...i, cat: 'income' }));
        const all = [...expenses, ...incomes];

        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.getElementById('construction-records-body');
        tbody.innerHTML = '';

        all.forEach(tx => {
            const color = tx.cat === 'income' ? 'green' : 'red';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td>
                <td>${tx.description}</td>
                <td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.ConstructionModule = new ConstructionModule();
