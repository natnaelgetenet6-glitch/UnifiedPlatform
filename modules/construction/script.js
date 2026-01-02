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
        
        // Check user role
        const currentUser = JSON.parse(sessionStorage.getItem('active_user'));
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        // Modify project field based on role
        const projectInput = form.querySelector('input[name="project"]');
        if (!isAdmin && projectInput) {
            // Replace input with select for non-admins
            const select = document.createElement('select');
            select.name = 'project';
            select.required = true;
            select.innerHTML = '<option value="">Select a Project</option>';
            
            // Get unique projects from existing data
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
        
        // Add bay field
        const amountInput = form.querySelector('input[name="amount"]');
        const bayGroup = document.createElement('div');
        bayGroup.className = 'form-group';
        bayGroup.innerHTML = '<label>Bay</label><input type="text" name="bay" required placeholder="e.g., Bay 1, Section A">';
        amountInput.parentNode.parentNode.insertBefore(bayGroup, amountInput.parentNode);
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                description: form.desc.value,
<<<<<<< Updated upstream
=======
                project: form.project.value,
                bay: form.bay.value,
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';
        all.forEach(tx => {
            const color = tx.cat === 'income' ? 'green' : 'red';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</td>`;
            tbody.appendChild(tr);
=======
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
                tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.project || 'N/A'}</td><td>${tx.bay || 'N/A'}</td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</td>`;
                tbody.appendChild(tr);
            });
        };

        // Initially show no records
        renderRecords('');

        // Add event listener
        select.addEventListener('change', (e) => {
            renderRecords(e.target.value);
>>>>>>> Stashed changes
        });
    }
}
window.ConstructionModule = new ConstructionModule();
