// Chat Module - Self-contained, doesn't interfere with game code
(function() {
    'use strict';

    const CHAT_API = '/api/chat';
    const POLL_INTERVAL = 2000; // Poll every 2 seconds

    let chatState = {
        username: null,
        messages: [],
        lastTimestamp: 0,
        pollInterval: null,
        isInitialized: false
    };

    // Initialize chat
    function initChat() {
        if (chatState.isInitialized) return;
        chatState.isInitialized = true;

        // Check if username is stored
        const storedUsername = localStorage.getItem('chatUsername');
        if (storedUsername) {
            chatState.username = storedUsername;
            showChatInterface();
        } else {
            showUsernamePrompt();
        }
    }

    // Show username prompt
    function showUsernamePrompt() {
        const modal = document.getElementById('chatUsernameModal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('chatUsernameInput');
            if (input) {
                input.focus();
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        setUsername();
                    }
                });
            }
        }
    }

    // Set username
    function setUsername() {
        const input = document.getElementById('chatUsernameInput');
        if (!input) return;

        const username = input.value.trim();
        if (username.length === 0) {
            alert('Please enter a username');
            return;
        }

        if (username.length > 20) {
            alert('Username must be 20 characters or less');
            return;
        }

        chatState.username = username;
        localStorage.setItem('chatUsername', username);
        
        const modal = document.getElementById('chatUsernameModal');
        if (modal) {
            modal.style.display = 'none';
        }

        showChatInterface();
    }

    // Show chat interface
    function showChatInterface() {
        const container = document.getElementById('chatContainer');
        if (container) {
            container.style.display = 'flex';
        }

        loadMessages();
        startPolling();
    }

    // Load messages
    async function loadMessages() {
        try {
            const response = await fetch(`${CHAT_API}?since=${chatState.lastTimestamp}`);
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    if (msg.timestamp > chatState.lastTimestamp) {
                        chatState.messages.push(msg);
                        chatState.lastTimestamp = Math.max(chatState.lastTimestamp, msg.timestamp);
                    }
                });
                updateChatDisplay();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    // Start polling for new messages
    function startPolling() {
        if (chatState.pollInterval) return;
        chatState.pollInterval = setInterval(loadMessages, POLL_INTERVAL);
    }

    // Stop polling
    function stopPolling() {
        if (chatState.pollInterval) {
            clearInterval(chatState.pollInterval);
            chatState.pollInterval = null;
        }
    }

    // Send message
    async function sendMessage() {
        const input = document.getElementById('chatMessageInput');
        if (!input || !chatState.username) return;

        const message = input.value.trim();
        if (message.length === 0) return;

        if (message.length > 500) {
            alert('Message too long (max 500 characters)');
            return;
        }

        input.value = '';
        input.disabled = true;

        try {
            const response = await fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: chatState.username, message })
            });

            const data = await response.json();
            if (data.success) {
                chatState.messages.push(data.message);
                chatState.lastTimestamp = Math.max(chatState.lastTimestamp, data.message.timestamp);
                updateChatDisplay();
            } else {
                alert('Failed to send message: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    // Update chat display
    function updateChatDisplay() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';
        chatState.messages.slice(-50).forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message';
            
            const time = new Date(msg.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageEl.innerHTML = `
                <span class="chat-username">${escapeHtml(msg.username)}:</span>
                <span class="chat-text">${escapeHtml(msg.message)}</span>
                <span class="chat-time">${timeStr}</span>
            `;
            
            messagesContainer.appendChild(messageEl);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toggle chat visibility
    function toggleChat() {
        const container = document.getElementById('chatContainer');
        if (container) {
            const isVisible = container.style.display !== 'none';
            container.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible) {
                loadMessages();
            }
        }
    }

    // Export functions to window
    window.chatModule = {
        init: initChat,
        setUsername: setUsername,
        sendMessage: sendMessage,
        toggleChat: toggleChat
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();

