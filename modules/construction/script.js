/**
 * Construction Module Script
 */
class ConstructionModule {
    constructor() {
        this.expenseKey = 'construction_expenses';
        this.incomeKey = 'construction_income';
    }

    initDashboard() {
        const expenses = window.Store.get(this.expenseKey) || [];
        const incomes = window.Store.get(this.incomeKey) || [];
        const totExp = expenses.reduce((a, c) => a + c.amount, 0);
        const totInc = incomes.reduce((a, c) => a + c.amount, 0);

        document.getElementById('cons-dash-expense').textContent = totExp.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('cons-dash-income').textContent = totInc.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('cons-dash-balance').textContent = (totInc - totExp).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    initForm(type) {
        const form = document.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                description: form.desc.value,
                amount: parseFloat(form.amount.value),
                date: new Date(form.date.value).toISOString(),
                type: type
            };
            const key = type === 'expense' ? this.expenseKey : this.incomeKey;
            window.Store.add(key, data);

            // Log the activity
            const actionType = 'Create';
            const moduleName = 'construction';
            const details = `${type === 'expense' ? 'Expense' : 'Income'} logged: ${data.description} - $${data.amount}`;
            window.Store.logActivity(actionType, moduleName, details);

            alert('Saved!');
            form.reset();
        });
    }

    initRecords() {
        const expenses = (window.Store.get(this.expenseKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (window.Store.get(this.incomeKey) || []).map(i => ({ ...i, cat: 'income' }));
        const all = [...expenses, ...incomes];
        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';
        all.forEach(tx => {
            const color = tx.cat === 'income' ? 'green' : 'red';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</td>`;
            tbody.appendChild(tr);
        });
    }
}
window.ConstructionModule = new ConstructionModule();
