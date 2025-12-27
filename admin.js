// Admin Panel JavaScript
const ADMIN_PASSWORD = '6Guu889Kiuj]]@0';

// Check if user is authenticated
function checkAuth() {
    return sessionStorage.getItem('adminAuthenticated') === 'true';
}

// Authenticate user
function authenticate(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        return true;
    }
    return false;
}

// Initialize admin panel
function initAdmin() {
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('adminLoginBtn');
    const errorMsg = document.getElementById('adminError');

    // Check if already authenticated
    if (checkAuth()) {
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'block';
        loadTransactions();
    } else {
        loginScreen.style.display = 'flex';
        adminPanel.style.display = 'none';
    }

    // Login button handler
    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        if (authenticate(password)) {
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'block';
            passwordInput.value = '';
            errorMsg.textContent = '';
            loadTransactions();
        } else {
            errorMsg.textContent = 'Incorrect password. Please try again.';
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    // Enter key handler
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    // Refresh button (removed from UI)
    // Clear data button (removed from UI)

    // Filter handlers
    const modeFilter = document.getElementById('modeFilter');
    const searchInput = document.getElementById('searchInput');
    
    modeFilter.addEventListener('change', loadTransactions);
    searchInput.addEventListener('input', loadTransactions);
}

// Load and display transactions
function loadTransactions() {
    try {
        const transactions = JSON.parse(localStorage.getItem('gameTransactions') || '[]');
        const modeFilter = document.getElementById('modeFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        // Filter transactions
        let filteredTransactions = transactions;
        
        if (modeFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.mode === modeFilter);
        }
        
        if (searchTerm) {
            filteredTransactions = filteredTransactions.filter(t => {
                return JSON.stringify(t).toLowerCase().includes(searchTerm);
            });
        }
        
        // Sort by timestamp (newest first)
        filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Display transactions
        displayTransactions(filteredTransactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsTableBody').innerHTML = 
            '<tr><td colspan="6" class="admin-empty">Error loading transactions</td></tr>';
    }
}

// Format amount (handles both points and SOL)
function formatAmount(amount) {
    if (amount >= 1000) {
        return amount.toFixed(2);
    } else if (amount >= 1) {
        return amount.toFixed(4);
    } else {
        return amount.toFixed(6);
    }
}

// Display transactions in table
function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map((transaction, index) => {
        const date = new Date(transaction.timestamp);
        const timeStr = date.toLocaleString();
        const betSize = formatAmount(transaction.betSize || 0);
        const payout = formatAmount(transaction.payout || 0);
        const net = formatAmount(transaction.netWinnings || (transaction.betSize - transaction.payout));
        const modeClass = transaction.mode ? transaction.mode.replace(/-/g, '-') : '';
        const modeLabel = formatModeLabel(transaction.mode || 'unknown');
        const netClass = net >= 0 ? 'positive' : 'negative';
        const netSign = net >= 0 ? '+' : '';
        
        return `
            <tr>
                <td>${timeStr}</td>
                <td>${betSize}</td>
                <td>${payout}</td>
                <td><span class="transaction-mode ${modeClass}">${modeLabel}</span></td>
                <td><span class="transaction-net ${netClass}">${netSign}${net}</span></td>
                <td>
                    <button class="transaction-details-btn" data-index="${index}">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Store filtered transactions for details modal
    window.filteredTransactions = transactions;
    
    // Add event listeners to detail buttons
    tbody.querySelectorAll('.transaction-details-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => showTransactionDetails(index));
    });
}

// Format mode label
function formatModeLabel(mode) {
    const labels = {
        'demo-normal': 'Demo - Normal',
        'demo-timeattack': 'Demo - Time Attack',
        'solana-normal': 'Solana - Normal',
        'solana-timeattack': 'Solana - Time Attack'
    };
    return labels[mode] || mode;
}

// Show transaction details modal
function showTransactionDetails(index) {
    const transaction = window.filteredTransactions[index];
    if (!transaction) return;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('transactionDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transactionDetailsModal';
        modal.className = 'transaction-details-modal';
        modal.innerHTML = `
            <div class="transaction-details-content">
                <h3>Transaction Details</h3>
                <div id="transactionDetailsBody"></div>
                <button class="transaction-details-close" onclick="closeTransactionDetails()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTransactionDetails();
            }
        });
    }
    
    const body = document.getElementById('transactionDetailsBody');
    const date = new Date(transaction.timestamp);
    
    body.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${date.toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Bet Size:</span>
            <span class="detail-value">${formatAmount(transaction.betSize || 0)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payout:</span>
            <span class="detail-value">${formatAmount(transaction.payout || 0)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Net Winnings:</span>
            <span class="detail-value" style="color: ${transaction.netWinnings >= 0 ? 'var(--green)' : 'var(--red)'}">
                ${transaction.netWinnings >= 0 ? '+' : ''}${formatAmount(transaction.netWinnings || 0)}
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Mode:</span>
            <span class="detail-value">${formatModeLabel(transaction.mode || 'unknown')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Bet Amount per Color:</span>
            <span class="detail-value">${formatAmount(transaction.betAmount || 0)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Selected Colors:</span>
            <span class="detail-value">${(transaction.selectedColors || []).join(', ')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Dice Results:</span>
            <span class="detail-value">${(transaction.diceResults || []).join(', ')}</span>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close transaction details modal
function closeTransactionDetails() {
    const modal = document.getElementById('transactionDetailsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAdmin);

