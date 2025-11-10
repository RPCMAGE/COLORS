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
    skippedRounds: 0
};

// Color configuration
const colors = ['yellow', 'orange', 'pink', 'blue', 'green', 'red'];

// Payout multipliers
const payouts = {
    normal: {
        1: 0.5,
        2: 1.0,
        3: 1.69
    },
    timeattack: {
        1: 0.95,
        2: 1.45,
        3: 1.95
    }
};

// Audio files
const audioFiles = {
    roll: ['Assets/Audio/Playing the game 1.mp3', 'Assets/Audio/Playing the game 2.mp3', 'Assets/Audio/Playing the game 3.mp3'],
    win: ['Assets/Audio/Win sound 1.mp3', 'Assets/Audio/Win sound 2.mp3', 'Assets/Audio/Win sound 3.mp3', 'Assets/Audio/Win sound 4.mp3', 'Assets/Audio/Win sound 5.mp3', 'Assets/Audio/Win sound 6.mp3']
};

// Initialize game
function init() {
    setupEventListeners();
    updateBalance();
    updateBetAmounts();
    // Disable roll button initially
    document.getElementById('rollBtn').disabled = true;
    initBackgroundMusic();
}

// Initialize background music
function initBackgroundMusic() {
    const bgMusic = document.getElementById('backgroundMusic');
    if (bgMusic) {
        bgMusic.volume = 0.4;
        
        // Try to play immediately
        bgMusic.play().catch(() => {
            // Autoplay blocked - start on first user interaction
            const startMusic = () => {
                bgMusic.play();
                document.removeEventListener('click', startMusic);
                document.removeEventListener('touchstart', startMusic);
            };
            document.addEventListener('click', startMusic);
            document.addEventListener('touchstart', startMusic);
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mode toggle
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => selectColor(btn.dataset.color));
    });

    // Bet controls
    document.getElementById('betAmount').addEventListener('input', (e) => {
        gameState.betAmount = parseInt(e.target.value) || 0;
        updateBetAmounts();
    });

    document.getElementById('placeBetBtn').addEventListener('click', placeBet);
    document.getElementById('clearBetBtn').addEventListener('click', clearBet);
    document.getElementById('rollBtn').addEventListener('click', rollDice);
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

    const btn = document.querySelector(`[data-color="${color}"]`);
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
            gameState.isRolling = false;
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
    const results = gameState.diceResults;
    let totalWin = 0;
    let maxMatches = 0;
    let allSame = results[0] === results[1] && results[1] === results[2];
    let bonusEligible = false;

    // Check matches for each selected color
    gameState.selectedColors.forEach(color => {
        const colorMatches = results.filter(r => r === color).length;
        if (colorMatches > 0) {
            maxMatches = Math.max(maxMatches, colorMatches);
            const multiplier = payouts[gameState.mode][colorMatches];
            const win = gameState.betAmount * multiplier;
            totalWin += win;
            
            // Check if this color got all 3 matches (bonus eligible)
            if (colorMatches === 3 && allSame) {
                bonusEligible = true;
            }
        }
    });

    // Bonus for all three dice same color in time attack mode
    if (gameState.mode === 'timeattack' && bonusEligible) {
        const bonus = gameState.betAmount * 0.5;
        totalWin += bonus;
    }

    // Update balance
    if (totalWin > 0) {
        gameState.balance += totalWin;
        playRandomSound('win');
        showConfetti();
        showResult(true, totalWin, maxMatches, bonusEligible);
    } else {
        showResult(false, 0, 0, false);
    }

    updateBalance();
    
    // Reset for next round
    setTimeout(() => {
        clearBet();
        resetDice();
        // Timer will restart after roll completes
    }, 3000);
}

// Show result
function showResult(won, winAmount, matches, bonus) {
    const resultDisplay = document.getElementById('resultDisplay');
    const resultTitle = document.getElementById('resultTitle');
    const resultText = document.getElementById('resultText');

    if (won) {
        resultDisplay.classList.add('win');
        resultTitle.textContent = 'WIN!';
        let text = `You matched ${matches} color(s)!`;
        text += `\nWon: ${winAmount.toFixed(2)}`;
        if (bonus && gameState.mode === 'timeattack') {
            text += `\n+ Bonus: ${(gameState.betAmount * 0.5).toFixed(2)}`;
        }
        resultText.textContent = text;
    } else {
        resultDisplay.classList.remove('win');
        resultTitle.textContent = 'No Match';
        resultText.textContent = 'Better luck next time!';
    }

    resultDisplay.classList.add('show');
    setTimeout(() => {
        resultDisplay.classList.remove('show');
    }, 3000);
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
    audio.volume = 0.5;
    audio.play().catch(err => {
        // Ignore audio play errors (user interaction required in some browsers)
        console.log('Audio play failed:', err);
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

