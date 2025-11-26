// Leaderboard Module - Self-contained, doesn't interfere with game code
(function() {
    'use strict';

    const LEADERBOARD_API = '/api/leaderboard';
    const UPDATE_INTERVAL = 5000; // Update every 5 seconds

    let leaderboardState = {
        leaderboard: [],
        updateInterval: null,
        isInitialized: false
    };

    // Initialize leaderboard
    function initLeaderboard() {
        if (leaderboardState.isInitialized) return;
        leaderboardState.isInitialized = true;

        loadLeaderboard();
        startAutoUpdate();
    }

    // Load leaderboard
    async function loadLeaderboard() {
        try {
            const response = await fetch(`${LEADERBOARD_API}?limit=10`);
            const data = await response.json();
            
            if (data.leaderboard) {
                leaderboardState.leaderboard = data.leaderboard;
                updateLeaderboardDisplay();
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }

    // Start auto-update
    function startAutoUpdate() {
        if (leaderboardState.updateInterval) return;
        leaderboardState.updateInterval = setInterval(loadLeaderboard, UPDATE_INTERVAL);
    }

    // Stop auto-update
    function stopAutoUpdate() {
        if (leaderboardState.updateInterval) {
            clearInterval(leaderboardState.updateInterval);
            leaderboardState.updateInterval = null;
        }
    }

    // Update leaderboard display
    function updateLeaderboardDisplay() {
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        container.innerHTML = '';

        if (leaderboardState.leaderboard.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">No players yet</div>';
            return;
        }

        leaderboardState.leaderboard.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            item.innerHTML = `
                <span class="leaderboard-rank">${medal} ${rank}</span>
                <span class="leaderboard-username">${escapeHtml(player.username)}</span>
                <span class="leaderboard-winnings">${formatCurrency(player.totalWinnings)}</span>
            `;
            
            container.appendChild(item);
        });
    }

    // Update winnings for a user
    async function updateWinnings(username, winnings) {
        if (!username || typeof winnings !== 'number') return;

        try {
            const response = await fetch(LEADERBOARD_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, winnings })
            });

            const data = await response.json();
            if (data.success) {
                // Reload leaderboard after a short delay
                setTimeout(loadLeaderboard, 500);
            }
        } catch (error) {
            console.error('Error updating leaderboard:', error);
        }
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toggle leaderboard visibility
    function toggleLeaderboard() {
        const container = document.getElementById('leaderboardContainer');
        if (container) {
            const isVisible = container.style.display !== 'none';
            container.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                loadLeaderboard();
            }
        }
    }

    // Export functions to window
    window.leaderboardModule = {
        init: initLeaderboard,
        updateWinnings: updateWinnings,
        toggleLeaderboard: toggleLeaderboard,
        loadLeaderboard: loadLeaderboard
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLeaderboard);
    } else {
        initLeaderboard();
    }
})();

