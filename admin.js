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

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', () => {
        loadTransactions();
    });
    
    // Initial load of health and analytics
    loadTransactions();
    
    // Update chart on window resize
    window.addEventListener('resize', () => {
        const transactions = JSON.parse(localStorage.getItem('gameTransactions') || '[]');
        updateAnalyticsChart(transactions);
    });

    // Clear data button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all transaction data? This cannot be undone.')) {
            localStorage.removeItem('gameTransactions');
            loadTransactions();
        }
    });

    // Filter handlers
    const modeFilter = document.getElementById('modeFilter');
    const searchInput = document.getElementById('searchInput');
    
    modeFilter.addEventListener('change', loadTransactions);
    searchInput.addEventListener('input', loadTransactions);

    // Initialize access code system
    if (window.accessCodeSystem) {
        window.accessCodeSystem.init();
        initAccessCodeManagement();
        initReferralManagement();
    }
}

// Initialize access code management
function initAccessCodeManagement() {
    const toggle = document.getElementById('accessCodeToggle');
    const generateBtn = document.getElementById('generateCodeBtn');
    
    if (!toggle || !generateBtn) return;
    
    // Load current state
    if (window.accessCodeSystem) {
        toggle.checked = window.accessCodeSystem.isRequired();
        loadAccessCodes();
    }
    
    // Toggle handler
    toggle.addEventListener('change', (e) => {
        if (window.accessCodeSystem) {
            window.accessCodeSystem.toggle(e.target.checked);
            loadAccessCodes();
        }
    });
    
    // Generate code handler
    generateBtn.addEventListener('click', () => {
        const usageLimit = prompt('Enter usage limit (leave empty for unlimited, or enter a number):');
        const expiration = prompt('Enter expiration date/time (YYYY-MM-DD HH:MM, or leave empty for no expiration):');
        
        let usageLimitNum = null;
        if (usageLimit && usageLimit.trim() !== '') {
            usageLimitNum = parseInt(usageLimit);
            if (isNaN(usageLimitNum) || usageLimitNum < 1) {
                alert('Invalid usage limit. Must be a positive number.');
                return;
            }
        }
        
        let expirationDate = null;
        if (expiration && expiration.trim() !== '') {
            expirationDate = new Date(expiration);
            if (isNaN(expirationDate.getTime())) {
                alert('Invalid date format. Please use YYYY-MM-DD HH:MM format.');
                return;
            }
            expirationDate = expirationDate.toISOString();
        }
        
        if (window.accessCodeSystem) {
            const code = window.accessCodeSystem.generate(usageLimitNum, expirationDate);
            alert(`New access code generated: ${code}`);
            loadAccessCodes();
        }
    });
}

// Load and display access codes
function loadAccessCodes() {
    const codeList = document.getElementById('codeList');
    if (!codeList || !window.accessCodeSystem) return;
    
    const codes = window.accessCodeSystem.getAll();
    
    if (codes.length === 0) {
        codeList.innerHTML = '<p class="admin-empty">No access codes found</p>';
        return;
    }
    
    codeList.innerHTML = codes.map(code => {
        const usageText = code.usageLimit === null 
            ? `Unlimited (${code.currentUsage} used)`
            : `${code.currentUsage}/${code.usageLimit} used`;
        
        const expirationText = code.expiration 
            ? new Date(code.expiration).toLocaleString()
            : 'No expiration';
        
        const isExpired = code.expiration && new Date(code.expiration) < new Date();
        
        return `
            <div class="admin-code-item ${isExpired ? 'expired' : ''}">
                <div class="admin-code-info">
                    <strong>${code.code}</strong>
                    <span class="admin-code-usage">${usageText}</span>
                    <span class="admin-code-expiration">Expires: ${expirationText}</span>
                    <span class="admin-code-created">Created: ${new Date(code.createdAt).toLocaleString()}</span>
                </div>
                <div class="admin-code-actions">
                    <button class="admin-delete-btn" onclick="deleteAccessCode('${code.code}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Delete access code
function deleteAccessCode(code) {
    if (!confirm(`Are you sure you want to delete access code "${code}"?`)) {
        return;
    }
    
    if (window.accessCodeSystem) {
        window.accessCodeSystem.delete(code);
        loadAccessCodes();
    }
}

// Initialize referral management
function initReferralManagement() {
    const multiplierInput = document.getElementById('globalMultiplier');
    const revenueShareInput = document.getElementById('revenueSharePercent');
    const saveMultiplierBtn = document.getElementById('saveMultiplierBtn');
    const saveRevenueShareBtn = document.getElementById('saveRevenueShareBtn');
    
    if (!window.accessCodeSystem) return;
    
    // Load current values
    const referralData = window.accessCodeSystem.getAllReferrals();
    if (multiplierInput) multiplierInput.value = referralData.globalMultiplier || 1.2;
    if (revenueShareInput) revenueShareInput.value = referralData.revenueSharePercent || 15;
    
    // Save handlers
    if (saveMultiplierBtn && multiplierInput) {
        saveMultiplierBtn.addEventListener('click', () => {
            const multiplier = parseFloat(multiplierInput.value);
            if (isNaN(multiplier) || multiplier < 1) {
                alert('Multiplier must be at least 1.0');
                return;
            }
            window.accessCodeSystem.setGlobalMultiplier(multiplier);
            alert('Global multiplier updated!');
            loadReferralStats();
        });
    }
    
    if (saveRevenueShareBtn && revenueShareInput) {
        saveRevenueShareBtn.addEventListener('click', () => {
            const percent = parseInt(revenueShareInput.value);
            if (isNaN(percent) || percent < 0 || percent > 100) {
                alert('Revenue share must be between 0 and 100');
                return;
            }
            window.accessCodeSystem.setRevenueSharePercent(percent);
            alert('Revenue share percentage updated!');
            loadReferralStats();
        });
    }
    
    loadReferralStats();
}

// Load referral statistics
function loadReferralStats() {
    const statsContainer = document.getElementById('referralStats');
    if (!statsContainer || !window.accessCodeSystem) return;
    
    const referralData = window.accessCodeSystem.getAllReferrals();
    const users = referralData.users || {};
    
    const totalUsers = Object.keys(users).length;
    const totalEarnings = Object.values(users).reduce((sum, user) => sum + (user.totalEarnings || 0), 0);
    const activeReferrers = Object.values(users).filter(user => user.referredBy !== null).length;
    
    statsContainer.innerHTML = `
        <div class="admin-referral-stat-card">
            <h3>Total Users</h3>
            <p class="stat-value">${totalUsers}</p>
        </div>
        <div class="admin-referral-stat-card">
            <h3>Active Referrers</h3>
            <p class="stat-value">${activeReferrers}</p>
        </div>
        <div class="admin-referral-stat-card">
            <h3>Total Referral Earnings</h3>
            <p class="stat-value">${totalEarnings.toFixed(4)}</p>
        </div>
    `;
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
                // Search in selected colors, dice results, and transaction data
                const searchableText = [
                    ...(t.selectedColors || []),
                    ...(t.diceResults || []),
                    t.mode,
                    t.betSize?.toString(),
                    t.payout?.toString()
                ].join(' ').toLowerCase();
                return searchableText.includes(searchTerm);
            });
        }
        
        // Sort by timestamp (newest first)
        filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Display transactions
        displayTransactions(filteredTransactions);
        
        // Update health summary and analytics
        updateHealthSummary(transactions);
        updateAnalyticsChart(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsTableBody').innerHTML = 
            '<tr><td colspan="6" class="admin-empty">Error loading transactions</td></tr>';
    }
}

// Update health summary
function updateHealthSummary(transactions) {
    // Calculate house balance (sum of all net winnings from house perspective)
    // Net winnings are from player perspective, so house balance = -sum(netWinnings)
    let houseBalance = 0;
    transactions.forEach(t => {
        // Net winnings positive = player won, house lost
        // Net winnings negative = player lost, house won
        houseBalance -= (t.netWinnings || 0);
    });
    
    // Update house balance display
    const houseBalanceEl = document.getElementById('houseBalance');
    if (houseBalanceEl) {
        if (Math.abs(houseBalance) >= 1) {
            houseBalanceEl.textContent = houseBalance.toFixed(2) + ' SOL';
        } else {
            houseBalanceEl.textContent = houseBalance.toFixed(4) + ' SOL';
        }
    }
    
    // Calculate health status
    const totalBets = transactions.reduce((sum, t) => sum + (t.betSize || 0), 0);
    const totalPayouts = transactions.reduce((sum, t) => sum + (t.payout || 0), 0);
    const profitMargin = totalBets > 0 ? ((totalBets - totalPayouts) / totalBets) * 100 : 0;
    
    const healthIndicator = document.getElementById('healthIndicator');
    const healthText = document.getElementById('healthText');
    
    if (healthIndicator && healthText) {
        if (profitMargin >= 3) {
            healthIndicator.className = 'health-indicator healthy';
            healthText.textContent = 'Healthy';
            healthText.style.color = 'var(--green)';
        } else if (profitMargin >= 0) {
            healthIndicator.className = 'health-indicator warning';
            healthText.textContent = 'Warning';
            healthText.style.color = 'var(--orange)';
        } else {
            healthIndicator.className = 'health-indicator critical';
            healthText.textContent = 'Critical';
            healthText.style.color = 'var(--red)';
        }
    }
}

// Update analytics chart
function updateAnalyticsChart(transactions) {
    const canvas = document.getElementById('playsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match container
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth - 32; // Account for padding
        canvas.height = 300;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (transactions.length === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '16px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Group transactions by hour/day
    const now = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push({
            date: date,
            count: 0
        });
    }
    
    transactions.forEach(t => {
        const tDate = new Date(t.timestamp);
        tDate.setHours(0, 0, 0, 0);
        const dayIndex = last7Days.findIndex(d => d.date.getTime() === tDate.getTime());
        if (dayIndex >= 0) {
            last7Days[dayIndex].count++;
        }
    });
    
    // Draw chart
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw bars
    const barWidth = chartWidth / last7Days.length;
    last7Days.forEach((day, index) => {
        const barHeight = (day.count / maxCount) * chartHeight;
        const x = padding + index * barWidth + barWidth * 0.1;
        const y = canvas.height - padding - barHeight;
        const width = barWidth * 0.8;
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, 'rgba(255, 94, 175, 0.8)');
        gradient.addColorStop(1, 'rgba(157, 78, 221, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);
        
        // Draw count label
        if (day.count > 0) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(day.count.toString(), x + width / 2, y - 5);
        }
        
        // Draw date label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Poppins';
        ctx.textAlign = 'center';
        const dateLabel = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(dateLabel, x + width / 2, canvas.height - padding + 20);
    });
    
    // Draw title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '14px Poppins';
    ctx.textAlign = 'left';
    ctx.fillText('Plays per Day (Last 7 Days)', padding, 25);
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

