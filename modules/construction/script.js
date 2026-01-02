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

        // Project breakdown
        const projectStats = {};
        expenses.forEach(exp => {
            const proj = exp.project || 'Unassigned';
            if (!projectStats[proj]) projectStats[proj] = { exp: 0, inc: 0 };
            projectStats[proj].exp += exp.amount;
        });
        incomes.forEach(inc => {
            const proj = inc.project || 'Unassigned';
            if (!projectStats[proj]) projectStats[proj] = { exp: 0, inc: 0 };
            projectStats[proj].inc += inc.amount;
        });

        const breakdownDiv = document.getElementById('projects-breakdown');
        breakdownDiv.innerHTML = '';
        Object.keys(projectStats).forEach(proj => {
            const stats = projectStats[proj];
            const balance = stats.inc - stats.exp;
            const balanceColor = balance >= 0 ? 'green' : 'red';
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;';
            div.innerHTML = `
                <strong>${proj}</strong>
                <div style="display: flex; gap: 20px;">
                    <span>Income: <span style="color: green;">$${stats.inc.toFixed(2)}</span></span>
                    <span>Expenses: <span style="color: red;">$${stats.exp.toFixed(2)}</span></span>
                    <span>Balance: <span style="color: ${balanceColor};">$${balance.toFixed(2)}</span></span>
                </div>
            `;
            breakdownDiv.appendChild(div);
        });
    }

    initForm(type) {
        const form = document.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                description: form.desc.value,
                project: form.project.value,
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

        // Get unique projects
        const projects = [...new Set(all.map(tx => tx.project).filter(p => p))];
        const select = document.getElementById('project-select');
        select.innerHTML = '<option value="">Select a Project</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            select.appendChild(option);
        });

        // Function to render records
        const renderRecords = (selectedProject) => {
            const tbody = document.querySelector('tbody');
            tbody.innerHTML = '';
            const filtered = selectedProject ? all.filter(tx => tx.project === selectedProject) : [];
            filtered.forEach(tx => {
                const color = tx.cat === 'income' ? 'green' : 'red';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.project || 'N/A'}</td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</td>`;
                tbody.appendChild(tr);
            });
        };

        // Initially show no records
        renderRecords('');

        // Add event listener
        select.addEventListener('change', (e) => {
            renderRecords(e.target.value);
        });
    }
}
window.ConstructionModule = new ConstructionModule();
