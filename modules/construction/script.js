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
        const totExp = expenses.reduce((a, c) => a + (c.amount || 0), 0);
        const totInc = incomes.reduce((a, c) => a + (c.amount || 0), 0);

        const elExp = document.getElementById('cons-dash-expense');
        const elInc = document.getElementById('cons-dash-income');
        const elBal = document.getElementById('cons-dash-balance');
        if (elExp) elExp.textContent = totExp.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        if (elInc) elInc.textContent = totInc.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        if (elBal) elBal.textContent = (totInc - totExp).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    initForm(type) {
        const form = document.querySelector('form');
        if (!form) return;

        const currentUser = JSON.parse(sessionStorage.getItem('active_user') || '{}');
        const isAdmin = currentUser && currentUser.role === 'admin';

        const projectInput = form.querySelector('input[name="project"]');
        if (!isAdmin && projectInput) {
            const select = document.createElement('select');
            select.name = 'project';
            select.required = true;
            select.innerHTML = '<option value="">Select a Project</option>';

            const expenses = window.Store.get(this.expenseKey) || [];
            const incomes = window.Store.get(this.incomeKey) || [];
            const allRecords = [...expenses, ...incomes];
            const projects = [...new Set(allRecords.map(r => r.project).filter(p => p))];
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                select.appendChild(option);
            });

            projectInput.parentNode.replaceChild(select, projectInput);
        }

        // Add bay field near amount
        const amountInput = form.querySelector('input[name="amount"]');
        if (amountInput) {
            const bayGroup = document.createElement('div');
            bayGroup.className = 'form-group';
            bayGroup.innerHTML = '<label>Bay</label><input type="text" name="bay" placeholder="e.g., Bay 1, Section A">';
            amountInput.parentNode.parentNode.insertBefore(bayGroup, amountInput.parentNode);
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                description: form.desc ? form.desc.value : '',
                project: form.project ? form.project.value : (form.querySelector('[name="project"]') ? form.querySelector('[name="project"]').value : ''),
                bay: form.bay ? form.bay.value : (form.querySelector('[name="bay"]') ? form.querySelector('[name="bay"]').value : ''),
                amount: parseFloat(form.amount.value) || 0,
                date: new Date(form.date.value).toISOString(),
                type: type
            };
            const key = type === 'expense' ? this.expenseKey : this.incomeKey;
            window.Store.add(key, data);
            window.Store.logActivity('Create', 'construction', `${type === 'expense' ? 'Expense' : 'Income'} logged: ${data.description} - $${data.amount}`);
            alert('Saved!');
            form.reset();
        });
    }

    initRecords() {
        const expenses = (window.Store.get(this.expenseKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (window.Store.get(this.incomeKey) || []).map(i => ({ ...i, cat: 'income' }));
        const all = [...expenses, ...incomes];
        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        const projects = [...new Set(all.map(tx => tx.project).filter(p => p))];
        const select = document.getElementById('project-select');
        if (select) {
            select.innerHTML = '<option value="">Select a Project</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                select.appendChild(option);
            });
        }

        const renderRecords = (selectedProject) => {
            const tbody = document.querySelector('tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const filtered = selectedProject ? all.filter(tx => tx.project === selectedProject) : [];
            filtered.forEach(tx => {
                const color = tx.cat === 'income' ? 'green' : 'red';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.project || 'N/A'}</td><td>${tx.bay || 'N/A'}</td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${(tx.amount||0).toFixed(2)}</td>`;
                const actionsTd = document.createElement('td');
                if (tx.status === 'voided') {
                    actionsTd.innerHTML = `<span style="color:#9ca3af">Voided</span><div style="font-size:0.8rem;color:#6b7280">by: ${tx.voided_by||''}<br/>${tx.void_reason||''}</div>`;
                } else {
                    actionsTd.innerHTML = `<button class="btn-danger" onclick="window.ConstructionModule.voidEntry(${tx.id}, '${tx.cat}')">Void</button>`;
                }
                tr.appendChild(actionsTd);
                tbody.appendChild(tr);
            });
        };

        // Initially show no records
        renderRecords('');

        if (select) select.addEventListener('change', (e) => { renderRecords(e.target.value); });

        const thead = document.querySelector('thead tr');
        if (thead && !thead.querySelector('.actions-header')) {
            const th = document.createElement('th'); th.className = 'actions-header'; th.textContent = 'Actions'; thead.appendChild(th);
        }

        // Void/Refund handler using global modal
        this.voidEntry = async (id, cat) => {
            const res = await window.UI.confirm({ title: 'Void Entry', message: 'Void this entry? This will mark it as canceled but keep the record.', placeholder: 'Reason (optional)', confirmText: 'Void', cancelText: 'Cancel', allowInput: true });
            if (!res || !res.confirmed) return;
            const reason = res.input || '';
            const key = cat === 'income' ? this.incomeKey : this.expenseKey;
            const item = window.Store.voidItem(key, id, reason);
            if (!item) { alert('Entry not found'); return; }
            window.Store.logActivity('Void', 'construction', `Voided ${cat} id=${id}`);
            this.initRecords();
            alert('Entry voided. Audit trail recorded.');
        };
    }
}
window.ConstructionModule = new ConstructionModule();
