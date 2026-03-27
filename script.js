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

// --- Application State ---
let allData = [];
let selectedItems = new Set();
let dataToDisplay = [];
let lastTimestamp = null;

// --- CORE UTILITY FUNCTIONS ---

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
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
    document.body.removeChild(textArea);
}

function updateStatusIndicator() {
    statusIndicator.textContent = `${selectedItems.size} items selected out of ${allData.length} loaded`;
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
}

// --- DATA LOGIC ---

function handleRefreshData() {
    resultsList.innerHTML = '';
    allData = [];
    selectedItems.clear();
    loadingIndicator.style.display = 'block';
    
    try {
        if (typeof SAMPLE_API_DATA === 'undefined') throw new Error('Data file missing');
        
        allData = Object.values(SAMPLE_API_DATA.workers).map(item => ({
            status: item.status || 'N/A',
            workerId: item.id || 'Unknown',
            displayPhoneNumber: item.phoneNumber || 'N/A',
            phoneNumber: (item.phoneNumber || '').replace(/[^0-9]/g, ''),
            companyAssigned: item.assignedCompany || 'N/A',
            serialNumber: item.serialNumber || 'N/A',
            imei: item.IMEI || 'N/A'
        }));
        
        lastTimestamp = Date.now();
        loadingIndicator.style.display = 'none';
    } catch (error) {
        loadingIndicator.style.display = 'none';
        resultsList.innerHTML = `<div style="color:red;">Error: ${error.message}</div>`;
    }
    
    performSearch();
    updateStatusIndicator();
}

function performSearch() {
    const search = searchInput.value.toLowerCase().trim();
    const filterOut = filterOutInput.value.toLowerCase().trim();
    resultsList.innerHTML = '';
    
    let filtered = allData;

    if (search) {
        const terms = search.split(/[,|\s]+/);
        filtered = allData.filter(item => 
            terms.some(t => Object.values(item).join(' ').toLowerCase().includes(t))
        );
    }

    if (filterOut) {
        const terms = filterOut.split(/[,|\s]+/);
        filtered = filtered.filter(item => 
            !terms.some(t => Object.values(item).join(' ').toLowerCase().includes(t))
        );
    }

    dataToDisplay = filtered;

    dataToDisplay.forEach(item => {
        const isSelected = selectedItems.has(item.workerId);
        const row = document.createElement('div');
        row.className = `result-item ${isSelected ? 'selected' : ''}`;
        
        const statusClass = `status-${item.status.toLowerCase()}`;
        
        row.innerHTML = `
            <div class="checkbox-container">
                <input type="checkbox" class="selection-checkbox" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="data-content">
                ${checkboxIDMode.checked ? `
                    <div class="id-only-display">
                        <span class="data-value">${item.workerId}</span>
                        <div class="status-line ${statusClass}">${item.status}</div>
                    </div>
                ` : `
                    <div class="status-line ${statusClass}">${item.status}</div>
                    <div class="data-grid">
                        <div class="grid-entry"><strong>ID:</strong> <span class="data-value">${item.workerId}</span></div>
                        <div class="grid-entry"><strong>Phone:</strong> <span class="data-value">${item.displayPhoneNumber}</span></div>
                        <div class="grid-entry"><strong>Co:</strong> <span class="data-value">${item.companyAssigned}</span></div>
                        <div class="grid-entry"><strong>Serial:</strong> <span class="data-value">${item.serialNumber}</span></div>
                    </div>
                `}
            </div>`;
        resultsList.appendChild(row);
    });
}

// --- EVENT LISTENERS ---

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
    updateStatusIndicator();
});

document.querySelectorAll('.multi-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        const selected = dataToDisplay.filter(i => selectedItems.has(i.workerId));
        const output = selected.map(i => field === 'all' ? `${i.workerId}\t${i.displayPhoneNumber}` : i[field]).join('\n');
        copyToClipboard(output);
    });
});

refreshDataBtn.addEventListener('click', handleRefreshData);
searchInput.addEventListener('input', performSearch);
filterOutInput.addEventListener('input', performSearch);
checkboxIDMode.addEventListener('change', performSearch);
setInterval(() => { lastRefreshTimeSpan.textContent = formatTimeAgo(lastTimestamp); }, 5000);

document.addEventListener('DOMContentLoaded', handleRefreshData);
