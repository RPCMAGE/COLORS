// Access Code Management System
// Handles access code validation, referral codes, and code management

// Default access code
const DEFAULT_ACCESS_CODE = 'colors2026';

// Access code settings (stored in localStorage, managed by admin)
let accessCodeSettings = {
    enabled: true, // Master toggle
    codes: [
        {
            code: DEFAULT_ACCESS_CODE,
            usageLimit: null, // null = unlimited
            currentUsage: 0,
            expiration: null, // null = no expiration
            createdAt: new Date().toISOString(),
            redeemedBy: [] // Array of {wallet/user, timestamp}
        }
    ]
};

// Referral system
let referralSystem = {
    users: {}, // { userId: { referralCode, referredBy, multiplier, totalEarnings } }
    globalMultiplier: 1.2, // Default 1.2x multiplier
    revenueSharePercent: 15 // 15% of house edge
};

// Initialize access code system
function initAccessCodeSystem() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('accessCodeSettings');
    if (savedSettings) {
        try {
            accessCodeSettings = JSON.parse(savedSettings);
        } catch (e) {
            console.error('Error loading access code settings:', e);
        }
    }

    // Load referral system from localStorage
    const savedReferrals = localStorage.getItem('referralSystem');
    if (savedReferrals) {
        try {
            referralSystem = JSON.parse(savedReferrals);
        } catch (e) {
            console.error('Error loading referral system:', e);
        }
    }

    // Generate referral code for current user if they don't have one
    const userId = getUserId();
    if (userId && !referralSystem.users[userId]) {
        generateReferralCode(userId);
    }
}

// Get user ID (wallet address or demo user ID)
function getUserId() {
    // Try to get wallet address first
    if (window.walletManager && window.walletManager.isConnected && window.walletManager.publicKey) {
        return window.walletManager.publicKey.toString();
    }
    
    // Fall back to demo user ID from localStorage
    let demoUserId = localStorage.getItem('demoUserId');
    if (!demoUserId) {
        demoUserId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('demoUserId', demoUserId);
    }
    return demoUserId;
}

// Check if access code is required
function isAccessCodeRequired() {
    return accessCodeSettings.enabled;
}

// Validate access code
function validateAccessCode(code) {
    if (!isAccessCodeRequired()) {
        return { valid: true, message: 'Access code not required' };
    }

    const normalizedCode = code.trim().toLowerCase();
    const codeEntry = accessCodeSettings.codes.find(c => c.code.toLowerCase() === normalizedCode);

    if (!codeEntry) {
        return { valid: false, message: 'Invalid access code' };
    }

    // Check expiration
    if (codeEntry.expiration && new Date(codeEntry.expiration) < new Date()) {
        return { valid: false, message: 'Access code has expired' };
    }

    // Check usage limit
    if (codeEntry.usageLimit !== null && codeEntry.currentUsage >= codeEntry.usageLimit) {
        return { valid: false, message: 'Access code has reached its usage limit' };
    }

    // Code is valid - increment usage and record redemption
    codeEntry.currentUsage++;
    const userId = getUserId();
    codeEntry.redeemedBy.push({
        userId: userId,
        timestamp: new Date().toISOString()
    });

    // Save updated settings
    saveAccessCodeSettings();

    return { valid: true, message: 'Access granted' };
}

// Save access code settings
function saveAccessCodeSettings() {
    localStorage.setItem('accessCodeSettings', JSON.stringify(accessCodeSettings));
}

// Generate a new access code
function generateAccessCode(usageLimit = null, expiration = null) {
    const code = generateRandomCode();
    const newCode = {
        code: code,
        usageLimit: usageLimit,
        currentUsage: 0,
        expiration: expiration,
        createdAt: new Date().toISOString(),
        redeemedBy: []
    };
    accessCodeSettings.codes.push(newCode);
    saveAccessCodeSettings();
    return code;
}

// Generate random alphanumeric code
function generateRandomCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Toggle access code requirement (admin function)
function toggleAccessCodeRequirement(enabled) {
    accessCodeSettings.enabled = enabled;
    saveAccessCodeSettings();
}

// Get all access codes (admin function)
function getAllAccessCodes() {
    return accessCodeSettings.codes;
}

// Delete access code (admin function)
function deleteAccessCode(code) {
    accessCodeSettings.codes = accessCodeSettings.codes.filter(c => c.code !== code);
    saveAccessCodeSettings();
}

// REFERRAL SYSTEM

// Generate referral code for user
function generateReferralCode(userId) {
    const code = generateRandomCode(10);
    referralSystem.users[userId] = {
        referralCode: code,
        referredBy: null,
        multiplier: 1.0, // Base multiplier
        totalEarnings: 0,
        createdAt: new Date().toISOString()
    };
    saveReferralSystem();
    return code;
}

// Get user's referral code
function getUserReferralCode(userId = null) {
    if (!userId) userId = getUserId();
    if (referralSystem.users[userId]) {
        return referralSystem.users[userId].referralCode;
    }
    return null;
}

// Get user's referral link
function getUserReferralLink(userId = null) {
    const code = getUserReferralCode(userId);
    if (!code) return null;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?ref=${code}`;
}

// Apply referral code (when user visits with ?ref=CODE)
function applyReferralCode(code) {
    const userId = getUserId();
    
    // Don't allow self-referral
    if (referralSystem.users[userId] && referralSystem.users[userId].referralCode === code) {
        return { success: false, message: 'Cannot use your own referral code' };
    }

    // Find referrer
    const referrer = Object.keys(referralSystem.users).find(
        uid => referralSystem.users[uid].referralCode === code
    );

    if (!referrer) {
        return { success: false, message: 'Invalid referral code' };
    }

    // Create user entry if doesn't exist
    if (!referralSystem.users[userId]) {
        generateReferralCode(userId);
    }

    // Set referrer
    referralSystem.users[userId].referredBy = referrer;
    referralSystem.users[referrer].multiplier = referralSystem.globalMultiplier;

    saveReferralSystem();
    return { success: true, message: 'Referral code applied successfully' };
}

// Get user's multiplier
function getUserMultiplier(userId = null) {
    if (!userId) userId = getUserId();
    if (referralSystem.users[userId] && referralSystem.users[userId].referredBy) {
        return referralSystem.users[referralSystem.users[userId].referredBy].multiplier;
    }
    return 1.0;
}

// Calculate referral earnings from house edge
function calculateReferralEarnings(betAmount, houseEdgePercent = 5) {
    const houseEdge = betAmount * (houseEdgePercent / 100);
    const referralEarnings = houseEdge * (referralSystem.revenueSharePercent / 100);
    return referralEarnings;
}

// Award referral earnings
function awardReferralEarnings(betAmount, houseEdgePercent = 5, userId = null) {
    if (!userId) userId = getUserId();
    const user = referralSystem.users[userId];
    
    if (!user || !user.referredBy) {
        return 0; // No referrer, no earnings
    }

    const earnings = calculateReferralEarnings(betAmount, houseEdgePercent);
    const referrer = referralSystem.users[user.referredBy];
    
    if (referrer) {
        referrer.totalEarnings += earnings;
        saveReferralSystem();
        return earnings;
    }
    
    return 0;
}

// Save referral system
function saveReferralSystem() {
    localStorage.setItem('referralSystem', JSON.stringify(referralSystem));
}

// Set global multiplier (admin function)
function setGlobalMultiplier(multiplier) {
    referralSystem.globalMultiplier = multiplier;
    saveReferralSystem();
}

// Set revenue share percent (admin function)
function setRevenueSharePercent(percent) {
    referralSystem.revenueSharePercent = percent;
    saveReferralSystem();
}

// Get all referral data (admin function)
function getAllReferralData() {
    return referralSystem;
}

// Check URL for referral code
function checkUrlForReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
        applyReferralCode(refCode);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.accessCodeSystem = {
        init: initAccessCodeSystem,
        isRequired: isAccessCodeRequired,
        validate: validateAccessCode,
        generate: generateAccessCode,
        toggle: toggleAccessCodeRequirement,
        getAll: getAllAccessCodes,
        delete: deleteAccessCode,
        getUserCode: getUserReferralCode,
        getUserLink: getUserReferralLink,
        applyReferral: applyReferralCode,
        getMultiplier: getUserMultiplier,
        awardEarnings: awardReferralEarnings,
        setGlobalMultiplier: setGlobalMultiplier,
        setRevenueSharePercent: setRevenueSharePercent,
        getAllReferrals: getAllReferralData,
        checkUrl: checkUrlForReferralCode
    };
}
