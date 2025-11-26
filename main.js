// Game State
const gameState = {
    mode: 'normal', // 'normal' or 'timeattack'
    balance: 1000,
    selectedColors: [],
    betAmount: 100,
    isRolling: false,
    diceResults: [],
    timer: null,
    timerInterval: null,
    timeLeft: 10,
    skippedRounds: 0,
    volume: 0.4, // Default volume (40%)
    resultsCalculated: false // Flag to prevent double calculation
};

// Color configuration
const colors = ['yellow', 'orange', 'pink', 'blue', 'green', 'red'];

// Payout multipliers (additive - bet + bet * multiplier per match)
// Calculated for 5% house edge (Normal) and 3% house edge (Time Attack)
// Probabilities: 0 matches (57.87%), 1 match (34.72%), 2 matches (6.94%), 3 matches (0.46%)
const payouts = {
    normal: {
        1: 1.04,   // Per-match multiplier for 5% house edge
        '3jackpot': 4.5  // Jackpot multiplier (all 3 dice same color)
    },
    timeattack: {
        1: 1.08,   // Per-match multiplier for 3% house edge
        '3jackpot': 5.0  // Jackpot multiplier (all 3 dice same color)
    }
};

// Audio files
const audioFiles = {
    roll: ['Assets/Audio/Playing the game 1.mp3', 'Assets/Audio/Playing the game 2.mp3', 'Assets/Audio/Playing the game 3.mp3'],
    win: ['Assets/Audio/Win sound 1.mp3', 'Assets/Audio/Win sound 2.mp3', 'Assets/Audio/Win sound 3.mp3', 'Assets/Audio/Win sound 4.mp3', 'Assets/Audio/Win sound 5.mp3', 'Assets/Audio/Win sound 6.mp3']
};

// Initialize game
function init() {
    try {
        setupEventListeners();
        updateBalance();
        updateBetAmounts();
        
        // Disable roll button initially
        const rollBtn = document.getElementById('rollBtn');
        if (rollBtn) {
            rollBtn.disabled = true;
        }
        
        initBackgroundMusic();
        setupVolumeControl();
        
        // Start music on first click anywhere
        const startMusicOnce = () => {
            const bgMusic = document.getElementById('backgroundMusic');
            if (bgMusic && bgMusic.paused) {
                bgMusic.play().catch(() => {});
            }
            document.removeEventListener('click', startMusicOnce);
            document.removeEventListener('touchstart', startMusicOnce);
        };
        document.addEventListener('click', startMusicOnce, { once: true });
        document.addEventListener('touchstart', startMusicOnce, { once: true });
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

// Initialize background music
function initBackgroundMusic() {
    const bgMusic = document.getElementById('backgroundMusic');
    if (bgMusic) {
        bgMusic.volume = gameState.volume;
        bgMusic.preload = 'auto';
        
        // Try to play - will fail if autoplay is blocked (expected)
        bgMusic.play().catch(() => {
            // Autoplay blocked - this is normal, music will start on first user interaction
        });
    }
}

// Setup volume control
function setupVolumeControl() {
    const volumeSlider = document.getElementById('volumeSlider');
    const bgMusic = document.getElementById('backgroundMusic');
    
    if (volumeSlider && bgMusic) {
        // Set initial volume
        volumeSlider.value = gameState.volume * 100;
        
        volumeSlider.addEventListener('input', function(e) {
            const volume = parseFloat(e.target.value) / 100;
            gameState.volume = volume;
            
            // Update background music volume
            bgMusic.volume = volume;
            
            // Try to play if not already playing (for autoplay-blocked scenarios)
            if (bgMusic.paused && volume > 0) {
                bgMusic.play().catch(() => {
                    // Ignore play errors - user interaction may be required
                });
            }
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mode toggle
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (btn.dataset.mode) {
                switchMode(btn.dataset.mode);
            }
        });
    });

    // Color buttons - use direct event delegation to ensure clicks work
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const color = btn.getAttribute('data-color');
            if (color) {
                selectColor(color);
            }
        });
    });

    // Bet controls
    const betAmountInput = document.getElementById('betAmount');
    if (betAmountInput) {
        betAmountInput.addEventListener('input', function(e) {
            const value = parseInt(e.target.value) || 0;
            gameState.betAmount = value;
            updateBetAmounts();
        });
    }

    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            placeBet();
        });
    }

    const clearBetBtn = document.getElementById('clearBetBtn');
    if (clearBetBtn) {
        clearBetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearBet();
        });
    }

    const rollBtn = document.getElementById('rollBtn');
    if (rollBtn) {
        rollBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            rollDice();
        });
    }
}

// Switch game mode
function switchMode(mode) {
    if (gameState.isRolling) return;
    
    gameState.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Reset timer if switching to time attack
    if (mode === 'timeattack') {
        // Clear any existing bet when switching to time attack
        if (gameState.selectedColors.length > 0) {
            clearBet();
        }
        startTimeAttackTimer();
    } else {
        stopTimer();
    }
}

// Select color
function selectColor(color) {
    if (gameState.isRolling) return;

    // Specifically target the button, not the span inside
    const btn = document.querySelector(`.color-btn[data-color="${color}"]`);
    if (!btn) return;
    
    const index = gameState.selectedColors.indexOf(color);

    if (index > -1) {
        // Deselect
        gameState.selectedColors.splice(index, 1);
        btn.classList.remove('selected');
    } else {
        // Select (max 3)
        if (gameState.selectedColors.length < 3) {
            gameState.selectedColors.push(color);
            btn.classList.add('selected');
        }
    }

    updateBetAmounts();
}

// Place bet
function placeBet() {
    if (gameState.isRolling) return;
    if (gameState.selectedColors.length === 0) {
        alert('Please select at least one color!');
        return;
    }
    if (gameState.betAmount <= 0) {
        alert('Please enter a valid bet amount!');
        return;
    }

    // Check if balance is sufficient
    const totalBet = gameState.betAmount * gameState.selectedColors.length;
    if (totalBet > gameState.balance) {
        alert('Insufficient balance for all selected colors!');
        return;
    }

    // Enable roll button (balance will be deducted when rolling)
    document.getElementById('rollBtn').disabled = false;
    updateBetAmounts();
    
    // Stop timer if in time attack mode
    if (gameState.mode === 'timeattack') {
        stopTimer();
    }
}

// Clear bet
function clearBet() {
    if (gameState.isRolling) return;
    
    gameState.selectedColors = [];
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateBetAmounts();
    document.getElementById('rollBtn').disabled = true;
}

// Update bet amounts display
function updateBetAmounts() {
    document.querySelectorAll('.bet-amount').forEach(el => {
        const color = el.dataset.color;
        if (gameState.selectedColors.includes(color)) {
            el.textContent = gameState.betAmount;
        } else {
            el.textContent = '0';
        }
    });
}

// Roll dice
function rollDice() {
    if (gameState.isRolling) return;
    if (gameState.selectedColors.length === 0) {
        alert('Please place a bet first!');
        return;
    }

    // Check balance and deduct bet
    const totalBet = gameState.betAmount * gameState.selectedColors.length;
    if (totalBet > gameState.balance) {
        alert('Insufficient balance!');
        return;
    }

    // Deduct bet from balance
    gameState.balance -= totalBet;
    updateBalance();

    gameState.isRolling = true;
    gameState.resultsCalculated = false; // Reset flag for new roll
    document.getElementById('rollBtn').disabled = true;
    
    // Play roll sound
    playRandomSound('roll');

    // Animate dice
    const diceElements = document.querySelectorAll('.dice');
    diceElements.forEach(die => {
        die.classList.add('rolling');
    });

    // Generate random results after animation
    setTimeout(() => {
        gameState.diceResults = [
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)]
        ];

        // Stop animation and show results
        diceElements.forEach((die, index) => {
            die.classList.remove('rolling');
            showDiceResult(die, gameState.diceResults[index]);
        });

        // Calculate and display results
        setTimeout(() => {
            calculateResults();
            // calculateResults() sets isRolling = false internally
            document.getElementById('rollBtn').disabled = false;
            
            // Restart timer if in time attack mode
            if (gameState.mode === 'timeattack') {
                setTimeout(() => {
                    startTimeAttackTimer();
                }, 1000);
            }
        }, 500);
    }, 1500);
}

// Show dice result
function showDiceResult(dieElement, color) {
    // Hide all faces first
    const faces = dieElement.querySelectorAll('.dice-face');
    faces.forEach(face => {
        face.style.display = 'none';
        face.classList.remove('result-face');
    });
    
    // Show the result face
    const resultFace = dieElement.querySelector(`[data-face="${color}"]`);
    if (resultFace) {
        resultFace.style.display = 'flex';
        resultFace.classList.add('result-face');
        // Position it to face forward with proper transform
        dieElement.style.transform = getDiceTransform(color);
        // Add glow effect
        resultFace.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)';
    }
}

// Get dice transform for showing result
function getDiceTransform(color) {
    const transforms = {
        yellow: 'rotateY(0deg) rotateX(0deg)',
        orange: 'rotateY(-90deg) rotateX(0deg)',
        pink: 'rotateY(180deg) rotateX(0deg)',
        blue: 'rotateY(90deg) rotateX(0deg)',
        green: 'rotateX(-90deg) rotateY(0deg)',
        red: 'rotateX(90deg) rotateY(0deg)'
    };
    return transforms[color] || 'rotateY(0deg) rotateX(0deg)';
}

// Calculate results
function calculateResults() {
    // Prevent double calculation - must be rolling, have colors selected, and not already calculated
    if (gameState.resultsCalculated || !gameState.isRolling || gameState.selectedColors.length === 0) {
        return;
    }
    
    // Validate dice results exist
    if (!gameState.diceResults || gameState.diceResults.length !== 3) {
        gameState.isRolling = false;
        return;
    }
    
    // Mark as calculated immediately to prevent race conditions
    gameState.resultsCalculated = true;
    
    // Store selected colors and bet amount before any state changes
    const selectedColors = [...gameState.selectedColors];
    const betAmount = gameState.betAmount;
    
    // Validate bet amount
    if (betAmount <= 0 || !betAmount || isNaN(betAmount)) {
        gameState.isRolling = false;
        return;
    }
    
    const results = [...gameState.diceResults]; // Copy to prevent mutation
    let totalWin = 0;
    let maxDiceMatches = 0; // Maximum dice matches for a single color
    let colorsMatched = 0; // Number of colors that matched
    let allSame = results[0] === results[1] && results[1] === results[2];
    let jackpotEligible = false;

    // Check matches for each selected color
    selectedColors.forEach(color => {
        const colorMatches = results.filter(r => r === color).length;
        if (colorMatches > 0) {
            colorsMatched++; // Count this color as matched
            maxDiceMatches = Math.max(maxDiceMatches, colorMatches);
            
            // Determine if this is a jackpot (all 3 dice same color AND matches selected color)
            const isJackpot = colorMatches === 3 && allSame && results[0] === color;
            
            // Calculate win: bet + (winnings for each matching die)
            // Each matching die adds its own winnings additively
            let win = betAmount; // Start with the bet amount
            
            if (isJackpot) {
                // Jackpot: bet + (bet * jackpot multiplier)
                win += betAmount * payouts[gameState.mode]['3jackpot'];
                jackpotEligible = true;
            } else {
                // For each matching die, add the winnings for that match count
                // multiplierPerMatch is the profit multiplier (not total return)
                // So for each match: bet + (bet * profitMultiplier)
                const profitMultiplierPerMatch = payouts[gameState.mode][1];
                // Each match adds: betAmount * profitMultiplierPerMatch
                win += betAmount * profitMultiplierPerMatch * colorMatches;
            }
            
            totalWin += win;
        }
    });

    // Update balance
    // totalWin represents the total return (bet + winnings) for each color
    // Since the bet was already deducted when rolling, we add back the full totalWin
    // The net profit shown to user is totalWin - (bet * number of colors)
    const totalBet = betAmount * selectedColors.length;
    const netWinnings = totalWin - totalBet;
    
    // Update balance atomically
    if (totalWin > 0) {
        gameState.balance += totalWin; // Add back full return (bet + winnings)
        playRandomSound('win');
        showConfetti();
        showResult(true, netWinnings, colorsMatched, maxDiceMatches, jackpotEligible);
        
        // Update leaderboard if user has a username (disconnected integration)
        if (window.leaderboardModule && typeof window.leaderboardModule.updateWinnings === 'function') {
            const chatUsername = localStorage.getItem('chatUsername');
            if (chatUsername) {
                window.leaderboardModule.updateWinnings(chatUsername, netWinnings);
            }
        }
    } else {
        showResult(false, 0, 0, 0, false);
    }

    // Update balance display once
    updateBalance();
    
    // Mark rolling as complete
    gameState.isRolling = false;
    
    // Debug: Log calculation details
    if (totalWin > 0) {
        console.log('Win Calculation:', {
            selectedColors: selectedColors.length,
            betPerColor: betAmount,
            totalBet,
            colorsMatched,
            maxDiceMatches,
            totalWin,
            netWinnings
        });
    }
    
    // Note: Dice and bet will reset when result display is dismissed (30s or OK button)
}

// Show result
function showResult(won, winAmount, colorsMatched, maxDiceMatches, jackpot) {
    const resultDisplay = document.getElementById('resultDisplay');
    const resultTitle = document.getElementById('resultTitle');
    const resultText = document.getElementById('resultText');
    const resultOkBtn = document.getElementById('resultOkBtn');

    // Clear any existing timeout
    if (resultDisplay.hideTimeout) {
        clearTimeout(resultDisplay.hideTimeout);
        resultDisplay.hideTimeout = null;
    }

    // Remove any existing click listeners
    const newOkBtn = resultOkBtn.cloneNode(true);
    resultOkBtn.parentNode.replaceChild(newOkBtn, resultOkBtn);

    if (won) {
        resultDisplay.classList.add('win');
        resultTitle.textContent = jackpot ? 'JACKPOT!' : 'WIN!';
        
        // Create accurate match message with breakdown
        let matchText = '';
        if (colorsMatched === 1) {
            matchText = `1 color matched with ${maxDiceMatches} dice!`;
        } else {
            matchText = `${colorsMatched} colors matched (max ${maxDiceMatches} dice)!`;
        }
        
        let text = matchText;
        text += `\nWinnings: ${winAmount >= 0 ? '+' : ''}${winAmount.toFixed(2)}`;
        if (winAmount < 0) {
            text += `\n(You lost on other colors you bet on)`;
        }
        if (jackpot) {
            text += `\n🎰 All 3 dice matched!`;
        }
        resultText.textContent = text;
    } else {
        resultDisplay.classList.remove('win');
        resultTitle.textContent = 'No Match';
        resultText.textContent = 'Better luck next time!';
    }

    // Function to hide the result display and reset for next round
    const hideResult = () => {
        resultDisplay.classList.remove('show');
        if (resultDisplay.hideTimeout) {
            clearTimeout(resultDisplay.hideTimeout);
            resultDisplay.hideTimeout = null;
        }
        
        // Reset dice and clear bet after result is dismissed
        // Only reset if not already rolling a new round
        if (!gameState.isRolling) {
            clearBet();
            resetDice();
        }
    };

    // Add click listener to OK button
    document.getElementById('resultOkBtn').addEventListener('click', hideResult);

    // Show the result display
    resultDisplay.classList.add('show');

    // Auto-hide after 30 seconds (10x longer than before)
    resultDisplay.hideTimeout = setTimeout(hideResult, 30000);
}

// Show confetti
function showConfetti() {
    const confetti = document.getElementById('confettiOverlay');
    confetti.classList.add('active');
    
    // Create confetti particles
    for (let i = 0; i < 50; i++) {
        createConfettiParticle();
    }

    setTimeout(() => {
        confetti.classList.remove('active');
        confetti.innerHTML = '';
    }, 2000);
}

// Create confetti particle
function createConfettiParticle() {
    const confetti = document.getElementById('confettiOverlay');
    const particle = document.createElement('div');
    const colors = ['#ffcc00', '#ff5eaf', '#0077b6', '#2a9d8f', '#e63946', '#ff8c42'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.position = 'absolute';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.backgroundColor = color;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = '-10px';
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = `0 0 10px ${color}`;
    
    confetti.appendChild(particle);
    
    const duration = 2 + Math.random();
    const delay = Math.random() * 0.5;
    const x = (Math.random() - 0.5) * 200;
    
    particle.style.transition = `transform ${duration}s ease-out ${delay}s, opacity ${duration}s ease-out ${delay}s`;
    particle.style.transform = `translate(${x}px, ${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`;
    particle.style.opacity = '0';
    
    setTimeout(() => particle.remove(), (duration + delay) * 1000);
}

// Reset dice
function resetDice() {
    const diceElements = document.querySelectorAll('.dice');
    diceElements.forEach(die => {
        die.style.transform = 'rotateY(0deg) rotateX(0deg)';
        const faces = die.querySelectorAll('.dice-face');
        faces.forEach(face => {
            face.style.display = 'flex';
            face.classList.remove('result-face');
            face.style.boxShadow = '';
        });
    });
}

// Update balance display
function updateBalance() {
    document.getElementById('balance').textContent = gameState.balance.toFixed(2);
}

// Play random sound
function playRandomSound(type) {
    const sounds = audioFiles[type];
    if (!sounds || sounds.length === 0) return;
    
    const soundFile = sounds[Math.floor(Math.random() * sounds.length)];
    const audio = new Audio(soundFile);
    audio.volume = gameState.volume * 0.5; // Use game volume, but slightly quieter for effects
    audio.play().catch(() => {
        // Ignore audio play errors (user interaction required in some browsers)
    });
}

// Time Attack Timer
function startTimeAttackTimer() {
    if (gameState.mode !== 'timeattack') return;
    
    stopTimer();
    gameState.timeLeft = 10;
    const timerDisplay = document.getElementById('timerDisplay');
    const timerFill = document.getElementById('timerFill');
    const timerText = document.getElementById('timerText');
    
    timerDisplay.classList.add('active');
    timerText.textContent = gameState.timeLeft;
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        timerText.textContent = gameState.timeLeft;
        timerFill.style.width = (gameState.timeLeft / 10 * 100) + '%';
        
        if (gameState.timeLeft <= 0) {
            stopTimer();
            // Skip rounds if no bet placed
            if (gameState.selectedColors.length === 0) {
                gameState.skippedRounds += 2;
                alert('Time\'s up! Skipping 2 rounds.');
            }
            // Restart timer after a delay
            setTimeout(() => {
                if (gameState.mode === 'timeattack') {
                    startTimeAttackTimer();
                }
            }, 2000);
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    document.getElementById('timerDisplay').classList.remove('active');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

