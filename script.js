// --- Element References ---
const searchInput = document.getElementById('searchInput');
const filterOutInput = document.getElementById('filterOutInput');
const resultsList = document.getElementById('resultsList');
const loadingIndicator = document.getElementById('loading');
const selectAllBtn = document.getElementById('selectAllBtn');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const statusIndicator = document.getElementById('selection-status');
const copySuccessIndicator = document.getElementById('copySuccess');
const checkboxModeToggle = document.getElementById('checkboxModeToggle');
const checkboxIDMode = document.getElementById('checkboxIDMode');
const lastRefreshTimeSpan = document.getElementById('lastRefreshTime');

let allData = [];
let selectedItems = new Set();
let dataToDisplay = [];
let lastTimestamp = null;

// --- Utility ---
function showCopySuccess() {
    copySuccessIndicator.style.opacity = '1';
    setTimeout(() => { copySuccessIndicator.style.opacity = '0'; }, 1500);
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) { console.error(err); }
    document.body.removeChild(textArea);
}

// --- Logic ---
function handleRefreshData() {
    console.log("Attempting to load data...");
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
        if (typeof SAMPLE_API_DATA === 'undefined') throw new Error('SAMPLE_API_DATA not found. Check sample-data.js');
        
        allData = Object.values(SAMPLE_API_DATA.workers).map(item => ({
            status: item.status || 'N/A',
            workerId: item.id || 'N/A',
            displayPhoneNumber: item.phoneNumber || 'N/A',
            companyAssigned: item.assignedCompany || 'N/A',
            serialNumber: item.serialNumber || 'N/A',
            imei: item.IMEI || 'N/A'
        }));
        
        lastTimestamp = Date.now();
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        performSearch();
    } catch (e) {
        console.error(e);
        if (resultsList) resultsList.innerHTML = `<div style="color:red; padding:20px;">${e.message}</div>`;
    }
}

function performSearch() {
    const search = searchInput.value.toLowerCase();
    const filter = filterOutInput.value.toLowerCase();
    resultsList.innerHTML = '';

    dataToDisplay = allData.filter(item => {
        const text = Object.values(item).join(' ').toLowerCase();
        const matchesSearch = search === '' || text.includes(search);
        const matchesFilter = filter === '' || !text.includes(filter);
        return matchesSearch && matchesFilter;
    });

    dataToDisplay.forEach(item => {
        const isSelected = selectedItems.has(item.workerId);
        const div = document.createElement('div');
        div.className = `result-item ${isSelected ? 'selected' : ''}`;
        
        // Compact ID Mode vs Full Mode
        if (checkboxIDMode && checkboxIDMode.checked) {
            div.innerHTML = `
                <div class="checkbox-container"><input type="checkbox" ${isSelected ? 'checked' : ''}></div>
                <div class="data-content id-only-display">
                    <span class="data-value">${item.workerId}</span>
                    <span class="status-line status-${item.status.toLowerCase()}">${item.status}</span>
                </div>`;
        } else {
            div.innerHTML = `
                <div class="checkbox-container"><input type="checkbox" ${isSelected ? 'checked' : ''}></div>
                <div class="data-content">
                    <div class="status-line status-${item.status.toLowerCase()}">${item.status}</div>
                    <div class="data-grid">
                        <div class="grid-entry"><strong>ID:</strong> <span class="data-value">${item.workerId}</span></div>
                        <div class="grid-entry"><strong>Phone:</strong> <span class="data-value">${item.displayPhoneNumber}</span></div>
                        <div class="grid-entry"><strong>Co:</strong> <span class="data-value">${item.companyAssigned}</span></div>
                        <div class="grid-entry"><strong>SN:</strong> <span class="data-value">${item.serialNumber}</span></div>
                    </div>
                </div>`;
        }
        resultsList.appendChild(div);
    });
    
    statusIndicator.textContent = `${selectedItems.size} selected / ${allData.length} total`;
}

// --- Listeners (With Safety Checks) ---
if (refreshDataBtn) refreshDataBtn.addEventListener('click', handleRefreshData);
if (searchInput) searchInput.addEventListener('input', performSearch);
if (filterOutInput) filterOutInput.addEventListener('input', performSearch);
if (checkboxIDMode) checkboxIDMode.addEventListener('change', performSearch);

resultsList.addEventListener('click', (e) => {
    const row = e.target.closest('.result-item');
    if (!row) return;

    if (e.target.classList.contains('data-value')) {
        copyToClipboard(e.target.textContent);
        return;
    }

    const cb = row.querySelector('input');
    cb.checked = !cb.checked;
    const id = row.querySelector('.data-value').textContent;
    cb.checked ? selectedItems.add(id) : selectedItems.delete(id);
    row.classList.toggle('selected');
    statusIndicator.textContent = `${selectedItems.size} selected / ${allData.length} total`;
});

document.querySelectorAll('.multi-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        const selected = allData.filter(i => selectedItems.has(i.workerId));
        const output = selected.map(i => field === 'all' ? `${i.workerId}\t${i.displayPhoneNumber}` : i[field]).join('\n');
        copyToClipboard(output);
    });
});

// Init
document.addEventListener('DOMContentLoaded', handleRefreshData);
