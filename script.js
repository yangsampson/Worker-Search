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
const appleMesBtn = document.getElementById('appleMesBtn');

// --- Application State ---
let allData = [];
let selectedItems = new Set();
let dataToDisplay = [];
let lastTimestamp = null;

const iMessages = [
    "I sincerely need iMessage activated on my device. I rely on this feature heavily for essential family communication, and I'd be truly grateful for your quick assistance.",
    "My iMessage activation has been difficult, and I'm asking for your help to get it working. I truly appreciate you taking the time to resolve this for me.",
    "I urgently request help with iMessage activation. It is a crucial feature for my work communication, and I'd be very thankful if you could ensure it's successfully activated now.",
    "Could you please look into and activate iMessage on my account? I understand you're busy, but getting this feature working is vitally important for me right now.",
    "I am submitting this sincere request for iMessage activation. I just need this one feature finalized, and your support in getting this done means a lot."
];

// --- CORE UTILITY FUNCTIONS ---

function showCopySuccess() {
    copySuccessIndicator.style.opacity = '1';
    setTimeout(() => {
        copySuccessIndicator.style.opacity = '0';
    }, 1500);
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; 
    textArea.style.opacity = 0;
    document.body.appendChild(textArea);
    textArea.focus();
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
    const totalLoaded = allData.length;
    statusIndicator.textContent = `${selectedItems.size} items selected out of ${totalLoaded} loaded items`;
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

function updateLastRefreshTimeDisplay() {
    lastRefreshTimeSpan.textContent = formatTimeAgo(lastTimestamp);
}

function startTimer() {
    setInterval(updateLastRefreshTimeDisplay, 1000);
}

function getStatusClass(status) {
    if (!status) return 'status-na';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('online')) return 'status-online';
    if (lowerStatus.includes('degraded')) return 'status-degraded';
    if (lowerStatus.includes('offline')) return 'status-offline';
    return 'status-na';
}

// --- DATA MAPPING & LOADING ---

function mapApiData(apiItem) {
    const displayPhone = apiItem.phoneNumber || 'N/A';
    return {
        status: apiItem.status || 'N/A',
        workerId: apiItem.id || 'UnknownID',
        displayPhoneNumber: displayPhone,
        phoneNumber: displayPhone.replace(/[^0-9]/g, ''),
        companyAssigned: apiItem.assignedCompany || 'N/A',
        serialNumber: apiItem.serialNumber || 'N/A',
        imei: apiItem.IMEI || 'N/A'
    };
}

function handleRefreshData() {
    resultsList.innerHTML = '';
    allData = [];
    selectedItems.clear();
    
    loadingIndicator.style.display = 'block';
    
    try {
        // Accessing the global object from sample-data.js
        if (typeof SAMPLE_API_DATA === 'undefined') {
            throw new Error('sample-data.js not loaded or SAMPLE_API_DATA is missing.');
        }

        const workersObject = SAMPLE_API_DATA.workers;
        allData = Object.values(workersObject).map(mapApiData);
        
        lastTimestamp = Date.now();
        loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error("Data load failed:", error);
        loadingIndicator.style.display = 'none';
        resultsList.innerHTML = `<div style="color:red; padding:10px;">Error: ${error.message}</div>`;
    }
    
    performSearch();
    updateStatusIndicator();
}

// --- SEARCH & DISPLAY LOGIC ---

function getSearchableString(item) {
    return `${item.status} ${item.workerId} ${item.phoneNumber} ${item.displayPhoneNumber} ${item.companyAssigned} ${item.serialNumber} ${item.imei}`.toLowerCase();
}

function performSearch() {
    const rawSearchTerm = searchInput.value.toLowerCase().trim();
    const rawFilterOutTerm = filterOutInput.value.toLowerCase().trim();
    resultsList.innerHTML = '';
    
    if (allData.length === 0) return;

    const isOrderMode = checkboxModeToggle.checked;
    const isIDMode = checkboxIDMode.checked;

    let filteredData = allData;

    // 1. Positive Search
    if (rawSearchTerm) {
        const inputTerms = rawSearchTerm.split(/[,|\s]+/).filter(t => t.length > 0);
        if (isOrderMode) {
            const foundData = [];
            const foundIds = new Set();
            inputTerms.forEach(term => {
                const foundItem = allData.find(item => !foundIds.has(item.workerId) && getSearchableString(item).includes(term));
                if (foundItem) {
                    foundData.push(foundItem);
                    foundIds.add(foundItem.workerId);
                }
            });
            filteredData = foundData;
        } else {
            filteredData = allData.filter(item => inputTerms.some(term => getSearchableString(item).includes(term)));
        }
    }

    // 2. Filter OUT
    if (rawFilterOutTerm) {
        const filterOutTerms = rawFilterOutTerm.split(/[,|\s]+/).filter(t => t.length > 0);
        filteredData = filteredData.filter(item => !filterOutTerms.some(term => getSearchableString(item).includes(term)));
    }

    dataToDisplay = filteredData;

    if (dataToDisplay.length > 0) {
        dataToDisplay.forEach(item => {
            const isSelected = selectedItems.has(item.workerId);
            const row = document.createElement('div');
            row.className = `result-item ${isSelected ? 'selected' : ''}`;
            row.dataset.workerId = item.workerId;
            
            const statusClass = getStatusClass(item.status);
            
            row.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" class="selection-checkbox" data-worker-id="${item.workerId}" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="data-content">
                    ${isIDMode ? `
                        <div class="id-only-display">
                            <span class="data-value" data-value="${item.workerId}">${item.workerId}</span>
                            <div class="status-line ${statusClass}">${item.status}</div>
                        </div>
                    ` : `
                        <div class="status-line ${statusClass}">${item.status}</div>
                        <div class="data-grid">
                            <strong>ID:</strong> <span class="data-value" data-value="${item.workerId}">${item.workerId}</span>
                            <strong>Phone:</strong> <span class="data-value" data-value="${item.displayPhoneNumber}">${item.displayPhoneNumber}</span>
                            <strong>Company:</strong> <span class="data-value" data-value="${item.companyAssigned}">${item.companyAssigned}</span>
                            <strong>Serial:</strong> <span class="data-value" data-value="${item.serialNumber}">${item.serialNumber}</span>
                            <strong>IMEI:</strong> <span class="data-value" data-value="${item.imei}">${item.imei}</span>
                        </div>
                    `}
                </div>`;
            resultsList.appendChild(row);
        });
    } else {
        resultsList.textContent = `No results found.`;
    }
    updateStatusIndicator();
}

// --- SELECTION & COPY HANDLERS ---

function handleCheckboxChange(event) {
    const checkbox = event.target.closest('.selection-checkbox');
    if (!checkbox) return;
    const workerId = checkbox.dataset.workerId;
    const row = checkbox.closest('.result-item');
    if (checkbox.checked) {
        selectedItems.add(workerId);
        row.classList.add('selected');
    } else {
        selectedItems.delete(workerId);
        row.classList.remove('selected');
    }
    updateStatusIndicator();
}

function handleRowClick(event) {
    const valueSpan = event.target.closest('.data-value');
    if (valueSpan) {
        event.stopPropagation();
        let val = valueSpan.dataset.value;
        // Strip prefixes on copy
        if (valueSpan.dataset.value === item?.displayPhoneNumber) {
             val = val.replace(/^\+1|^\+/, '').trim();
        }
        copyToClipboard(val);
        return;
    }

    const row = event.target.closest('.result-item');
    if (row && !event.target.closest('input[type="checkbox"]')) {
        const cb = row.querySelector('.selection-checkbox');
        cb.checked = !cb.checked;
        handleCheckboxChange({ target: cb });
    }
}

function copySelectedData(field) {
    if (selectedItems.size === 0) return;
    const selectedData = dataToDisplay.filter(item => selectedItems.has(item.workerId));
    let output = '';

    if (field === 'all') {
        output = selectedData.map(item => {
            const phone = item.displayPhoneNumber.replace(/^\+1|^\+/, '').trim();
            return `${item.workerId}\t${phone}\t${item.serialNumber}`;
        }).join('\n');
    } else if (field === 'displayPhoneNumber') {
        output = selectedData.map(item => item[field].replace(/^\+1|^\+/, '').trim()).join('\n');
    } else {
        output = selectedData.map(item => item[field] || '').join('\n');
    }
    copyToClipboard(output);
}

// --- EVENT LISTENERS ---
resultsList.addEventListener('click', handleRowClick);
resultsList.addEventListener('change', handleCheckboxChange);
searchInput.addEventListener('input', performSearch);
filterOutInput.addEventListener('input', performSearch);
selectAllBtn.addEventListener('click', () => {
    const allSel = dataToDisplay.every(i => selectedItems.has(i.workerId));
    dataToDisplay.forEach(i => {
        selectedItems[allSel ? 'delete' : 'add'](i.workerId);
    });
    performSearch();
});

checkboxModeToggle.addEventListener('change', performSearch);
checkboxIDMode.addEventListener('change', performSearch);
refreshDataBtn.addEventListener('click', handleRefreshData);

appleMesBtn.addEventListener('click', () => {
    copyToClipboard(iMessages[Math.floor(Math.random() * iMessages.length)]);
});

document.querySelectorAll('.multi-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => copySelectedData(e.target.dataset.field));
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    startTimer();
    handleRefreshData();
});
