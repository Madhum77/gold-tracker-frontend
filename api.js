// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Fetch current rates and update UI
async function fetchCurrentRates() {
    try {
        console.log('Fetching current rates...');
        const response = await fetch(`${API_BASE_URL}/gold/current`);
        const result = await response.json();
        console.log('Current rates response:', result);
        
        if (result.success && result.data) {
            updateUIRates(result.data);
        }
    } catch (error) {
        console.error('Error fetching rates:', error);
        document.querySelectorAll('.rate-box .change')[0].innerHTML = 'Error: ' + error.message;
    }
}

// Fetch table data
async function fetchTableData() {
    try {
        const response = await fetch(`${API_BASE_URL}/gold/table`);
        const result = await response.json();
        
        if (result.success && result.data) {
            updateUITable(result.data);
        }
    } catch (error) {
        console.error('Error fetching table:', error);
    }
}

// Fetch graph data
async function fetchGraphData(period = '7days') {
    try {
        const response = await fetch(`${API_BASE_URL}/gold/graph?period=${period}`);
        const result = await response.json();
        
        if (result.success && result.data && window.goldChart) {
            window.goldChart.data.labels = result.data.labels;
            window.goldChart.data.datasets[0].data = result.data.data;
            window.goldChart.update();
        }
    } catch (error) {
        console.error('Error fetching graph:', error);
    }
}

// Update UI with rates
function updateUIRates(data) {
    if (!data || !data.rates) return;
    
    const rateBoxes = document.querySelectorAll('.rate-box .price');
    const changes = document.querySelectorAll('.rate-box .change');
    
    if (rateBoxes.length >= 4) {
        rateBoxes[0].textContent = '₹' + data.rates['22k'].perGram.toLocaleString('en-IN');
        rateBoxes[1].textContent = '₹' + data.rates['24k'].perGram.toLocaleString('en-IN');
        rateBoxes[2].textContent = '₹' + data.rates['22k'].per8Gram.toLocaleString('en-IN');
        rateBoxes[3].textContent = '₹' + data.rates['24k'].per8Gram.toLocaleString('en-IN');
    }
    
    if (changes.length >= 4 && data.change) {
        const change22k = data.change['22k'] || 0;
        const change24k = data.change['24k'] || 0;
        const changePercent22k = data.changePercent?.['22k'] || 0;
        const changePercent24k = data.changePercent?.['24k'] || 0;
        
        changes[0].innerHTML = `<i class="fas fa-arrow-${change22k >= 0 ? 'up' : 'down'}"></i> ₹${Math.abs(change22k).toLocaleString('en-IN')} (${changePercent22k.toFixed(2)}%)`;
        changes[1].innerHTML = `<i class="fas fa-arrow-${change24k >= 0 ? 'up' : 'down'}"></i> ₹${Math.abs(change24k).toLocaleString('en-IN')} (${changePercent24k.toFixed(2)}%)`;
        changes[2].innerHTML = `<i class="fas fa-arrow-${change22k >= 0 ? 'up' : 'down'}"></i> ₹${Math.abs(change22k * 8).toLocaleString('en-IN')} (${changePercent22k.toFixed(2)}%)`;
        changes[3].innerHTML = `<i class="fas fa-arrow-${change24k >= 0 ? 'up' : 'down'}"></i> ₹${Math.abs(change24k * 8).toLocaleString('en-IN')} (${changePercent24k.toFixed(2)}%)`;
    }
    
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString('en-IN');
    }
}

// Update table with data
function updateUITable(data) {
    const tableBody = document.getElementById('goldTable');
    if (!tableBody) return;
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
        const arrow22k = row.gold22k.change >= 0 ? 'up' : 'down';
        const arrow24k = row.gold24k.change >= 0 ? 'up' : 'down';
        
        tr.innerHTML = `
            <td><strong>${row.date}</strong></td>
            <td><strong>₹${row.gold22k.per8Gram.toLocaleString('en-IN')}</strong></td>
            <td><span class="${row.gold22k.change >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${arrow22k}"></i> ${Math.abs(row.gold22k.change).toLocaleString('en-IN')} ${row.gold22k.change >= 0 ? '▲' : '▼'}</span></td>
            <td><strong>₹${row.gold24k.per8Gram.toLocaleString('en-IN')}</strong></td>
            <td><span class="${row.gold24k.change >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${arrow24k}"></i> ${Math.abs(row.gold24k.change).toLocaleString('en-IN')} ${row.gold24k.change >= 0 ? '▲' : '▼'}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

// Switch graph period
window.switchGraph = function(period) {
    fetchGraphData(period);
    document.querySelectorAll('.time-toggle button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(period.replace('days', ''))) {
            btn.classList.add('active');
        }
    });
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('API.js loaded');
    fetchCurrentRates();
    fetchTableData();
    fetchGraphData('7days');
    setInterval(fetchCurrentRates, 30000);
});