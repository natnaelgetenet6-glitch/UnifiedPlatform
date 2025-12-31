/**
 * Analytics.js
 * Comprehensive reporting and analytics for the unified platform
 */

class Analytics {
    constructor() {
        this.currentPeriod = 30; // days
        this.charts = {};
        this.init();
    }

    init() {
        this.loadChartLibrary();
    }

    loadChartLibrary() {
        // Load Chart.js for visualizations
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => this.initCharts();
            document.head.appendChild(script);
        } else {
            this.initCharts();
        }
    }

    initCharts() {
        // Charts will be initialized when the analytics view is loaded
    }

    renderAnalytics() {
        this.updatePeriodSelector();
        this.calculateMetrics();
        this.renderCharts();
        this.renderTopItems();
        this.renderTransactionSummary();
        this.setupEventListeners();
    }

    updatePeriodSelector() {
        const selector = document.getElementById('analytics-period');
        if (selector) {
            selector.value = this.currentPeriod;
        }
    }

    calculateMetrics() {
        const now = new Date();
        const periodStart = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        const previousPeriodStart = new Date(periodStart.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));

        // Calculate current period metrics
        const currentMetrics = this.getMetricsForPeriod(periodStart, now);
        const previousMetrics = this.getMetricsForPeriod(previousPeriodStart, periodStart);

        // Update display
        this.updateMetricDisplay('analytics-total-revenue', currentMetrics.totalRevenue, previousMetrics.totalRevenue);
        this.updateMetricDisplay('analytics-exchange-volume', currentMetrics.exchangeVolume, previousMetrics.exchangeVolume);
        this.updateMetricDisplay('analytics-pharmacy-sales', currentMetrics.pharmacySales, previousMetrics.pharmacySales);
        this.updateMetricDisplay('analytics-construction-profit', currentMetrics.constructionProfit, previousMetrics.constructionProfit);
    }

    getMetricsForPeriod(startDate, endDate) {
        const metrics = {
            totalRevenue: 0,
            exchangeVolume: 0,
            pharmacySales: 0,
            constructionProfit: 0
        };

        // Exchange metrics
        const exchangeTx = window.Store.get('exchange_transactions') || [];
        exchangeTx.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate >= startDate && txDate <= endDate) {
                const amount = tx.amount * tx.rate;
                metrics.exchangeVolume += amount;
                metrics.totalRevenue += amount * 0.02; // 2% spread
            }
        });

        // Pharmacy metrics
        const pharmacySales = window.Store.get('pharmacy_sales') || [];
        pharmacySales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= startDate && saleDate <= endDate) {
                metrics.pharmacySales += sale.total;
                metrics.totalRevenue += sale.total;
            }
        });

        // Construction metrics
        const constructionIncome = window.Store.get('construction_income') || [];
        const constructionExpenses = window.Store.get('construction_expenses') || [];

        let income = 0, expenses = 0;
        constructionIncome.forEach(inc => {
            const incDate = new Date(inc.date);
            if (incDate >= startDate && incDate <= endDate) {
                income += inc.amount;
            }
        });

        constructionExpenses.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate >= startDate && expDate <= endDate) {
                expenses += exp.amount;
            }
        });

        metrics.constructionProfit = income - expenses;
        metrics.totalRevenue += metrics.constructionProfit;

        return metrics;
    }

    updateMetricDisplay(elementId, currentValue, previousValue) {
        const element = document.getElementById(elementId);
        const changeElement = document.getElementById(elementId.replace('-', '-') + '-change');

        if (element) {
            element.textContent = currentValue.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD'
            });
        }

        if (changeElement) {
            const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
            const changeText = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
            changeElement.textContent = `${changeText} from last period`;
            changeElement.style.color = change >= 0 ? 'var(--success)' : 'var(--danger)';
        }
    }

    renderCharts() {
        this.renderRevenueTrendChart();
        this.renderModulePerformanceChart();
    }

    renderRevenueTrendChart() {
        const ctx = document.getElementById('revenue-trend-chart');
        if (!ctx) return;

        // Generate data for the last 30 days
        const data = this.generateTrendData(30);

        if (this.charts.revenueTrend) {
            this.charts.revenueTrend.destroy();
        }

        this.charts.revenueTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Total Revenue',
                    data: data.revenue,
                    borderColor: 'var(--primary)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    renderModulePerformanceChart() {
        const ctx = document.getElementById('module-performance-chart');
        if (!ctx) return;

        const data = this.getModulePerformanceData();

        if (this.charts.modulePerformance) {
            this.charts.modulePerformance.destroy();
        }

        this.charts.modulePerformance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'var(--primary)',
                        'var(--success)',
                        'var(--warning)',
                        'var(--danger)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    generateTrendData(days) {
        const labels = [];
        const revenue = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            labels.push(date.toLocaleDateString());

            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const dayMetrics = this.getMetricsForPeriod(dayStart, dayEnd);
            revenue.push(dayMetrics.totalRevenue);
        }

        return { labels, revenue };
    }

    getModulePerformanceData() {
        const now = new Date();
        const periodStart = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        const metrics = this.getMetricsForPeriod(periodStart, now);

        return {
            labels: ['Exchange', 'Pharmacy', 'Construction'],
            values: [
                metrics.exchangeVolume,
                metrics.pharmacySales,
                Math.abs(metrics.constructionProfit)
            ]
        };
    }

    renderTopItems() {
        const container = document.getElementById('top-items-list');
        if (!container) return;

        // Get top performing items from pharmacy
        const pharmacySales = window.Store.get('pharmacy_sales') || [];
        const itemPerformance = {};

        pharmacySales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    if (!itemPerformance[item.name]) {
                        itemPerformance[item.name] = {
                            revenue: 0,
                            quantity: 0
                        };
                    }
                    itemPerformance[item.name].revenue += item.price * item.qty;
                    itemPerformance[item.name].quantity += item.qty;
                });
            }
        });

        // Sort by revenue
        const sortedItems = Object.entries(itemPerformance)
            .sort(([,a], [,b]) => b.revenue - a.revenue)
            .slice(0, 10);

        if (sortedItems.length === 0) {
            container.innerHTML = '<div class="empty-state">No sales data available</div>';
            return;
        }

        container.innerHTML = sortedItems.map(([name, data]) => `
            <div class="item">
                <div class="name">${name}</div>
                <div class="value">$${data.revenue.toFixed(2)}</div>
            </div>
        `).join('');
    }

    renderTransactionSummary() {
        const tbody = document.getElementById('transaction-summary-body');
        if (!tbody) return;

        const now = new Date();
        const periodStart = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));

        // Exchange summary
        const exchangeTx = window.Store.get('exchange_transactions') || [];
        const exchangeFiltered = exchangeTx.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= periodStart && txDate <= now;
        });

        const exchangeTotal = exchangeFiltered.reduce((sum, tx) => sum + (tx.amount * tx.rate), 0);
        const exchangeCount = exchangeFiltered.length;
        const exchangeAvg = exchangeCount > 0 ? exchangeTotal / exchangeCount : 0;

        // Pharmacy summary
        const pharmacySales = window.Store.get('pharmacy_sales') || [];
        const pharmacyFiltered = pharmacySales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= periodStart && saleDate <= now;
        });

        const pharmacyTotal = pharmacyFiltered.reduce((sum, sale) => sum + sale.total, 0);
        const pharmacyCount = pharmacyFiltered.length;
        const pharmacyAvg = pharmacyCount > 0 ? pharmacyTotal / pharmacyCount : 0;

        // Construction summary
        const constructionIncome = window.Store.get('construction_income') || [];
        const constructionExpenses = window.Store.get('construction_expenses') || [];

        const incomeFiltered = constructionIncome.filter(inc => {
            const incDate = new Date(inc.date);
            return incDate >= periodStart && incDate <= now;
        });

        const expenseFiltered = constructionExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= periodStart && expDate <= now;
        });

        const constructionTotal = incomeFiltered.reduce((sum, inc) => sum + inc.amount, 0) -
                                 expenseFiltered.reduce((sum, exp) => sum + exp.amount, 0);
        const constructionCount = incomeFiltered.length + expenseFiltered.length;
        const constructionAvg = constructionCount > 0 ? Math.abs(constructionTotal) / constructionCount : 0;

        tbody.innerHTML = `
            <tr>
                <td>Exchange</td>
                <td>${exchangeCount}</td>
                <td>$${exchangeTotal.toFixed(2)}</td>
                <td>$${exchangeAvg.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Pharmacy</td>
                <td>${pharmacyCount}</td>
                <td>$${pharmacyTotal.toFixed(2)}</td>
                <td>$${pharmacyAvg.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Construction</td>
                <td>${constructionCount}</td>
                <td>$${constructionTotal.toFixed(2)}</td>
                <td>$${constructionAvg.toFixed(2)}</td>
            </tr>
        `;
    }

    setupEventListeners() {
        // Period selector
        const periodSelector = document.getElementById('analytics-period');
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                this.currentPeriod = parseInt(e.target.value);
                this.renderAnalytics();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-analytics-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }

        // Tab buttons
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked tab
                btn.classList.add('active');
                // Render detailed breakdown
                this.renderDetailedBreakdown(btn.dataset.tab);
            });
        });
    }

    renderDetailedBreakdown(period) {
        const container = document.getElementById('detailed-breakdown-content');
        if (!container) return;

        const data = this.getDetailedBreakdownData(period);
        // This would render detailed tables/charts for the selected time period
        container.innerHTML = `
            <div class="grid-layout">
                <div class="card">
                    <h4>${period.charAt(0).toUpperCase() + period.slice(1)} Breakdown</h4>
                    <p>Detailed analytics for ${period} view will be implemented here.</p>
                    <ul>
                        <li>Total Periods: ${data.length}</li>
                        <li>Average Revenue: $${data.avgRevenue?.toFixed(2) || '0.00'}</li>
                        <li>Peak Period: ${data.peakPeriod || 'N/A'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getDetailedBreakdownData(period) {
        // Mock data for detailed breakdown
        // In a real implementation, this would calculate based on the period type
        return {
            length: 10,
            avgRevenue: 1250.50,
            peakPeriod: 'Week of Dec 15'
        };
    }

    exportReport() {
        // Create a simple CSV export
        const data = this.generateExportData();
        const csv = this.convertToCSV(data);
        this.downloadCSV(csv, `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    }

    generateExportData() {
        // Generate export data based on current analytics
        return [
            ['Metric', 'Value', 'Change'],
            ['Total Revenue', document.getElementById('analytics-total-revenue')?.textContent || '$0', ''],
            ['Exchange Volume', document.getElementById('analytics-exchange-volume')?.textContent || '$0', ''],
            ['Pharmacy Sales', document.getElementById('analytics-pharmacy-sales')?.textContent || '$0', ''],
            ['Construction Profit', document.getElementById('analytics-construction-profit')?.textContent || '$0', '']
        ];
    }

    convertToCSV(data) {
        return data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Initialize analytics when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.Analytics = new Analytics();
});