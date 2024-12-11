let peer;
let conn;
let username = '';
let localStream;
let remoteStream;
let currentCall;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const chatScreen = document.getElementById('chatScreen');
const callScreen = document.getElementById('callScreen');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const peerIdDisplay = document.getElementById('peerIdDisplay');
const modalPeerId = document.getElementById('modalPeerId');
const mainMenuBtn = document.getElementById('mainMenuBtn');
const chatMenuBtn = document.getElementById('chatMenuBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyPeerIdBtn = document.getElementById('copyPeerIdBtn');
const connectBtn = document.getElementById('connectBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const backBtn = document.getElementById('backBtn');
const chatList = document.getElementById('chatList');
const noChatMessage = document.getElementById('noChatMessage');
const fileInput = document.getElementById('fileInput');
const profilePicInput = document.getElementById('profilePicInput');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const endCallBtn = document.getElementById('endCallBtn');
const byteChatAiBtn = document.getElementById('byteChatAiBtn');
const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popupMessage');
const popupCloseBtn = document.getElementById('popupCloseBtn');
const contextMenu = document.getElementById('contextMenu');
const copyMessageBtn = document.getElementById('copyMessage');
const deleteMessageBtn = document.getElementById('deleteMessage');

// Initialize PeerJS
function initializePeer() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        peerIdDisplay.textContent = id;
        modalPeerId.textContent = id;
        loadSavedConnections();
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });

    peer.on('call', (call) => {
        handleIncomingCall(call);
    });

    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        showPopup('Connection error: ' + err.message);
    });
}

// Load saved connections
function loadSavedConnections() {
    const savedConnections = JSON.parse(localStorage.getItem('savedConnections')) || [];
    savedConnections.forEach(connection => {
        conn = peer.connect(connection.peerId);
        setupConnection();
    });
}

// Login Handler
loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    const password = document.getElementById('password').value.trim();

    if (username && password) {
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
        showMainScreen();
    } else {
        showPopup('Please enter both username and password');
    }
});

// Check for saved login
window.addEventListener('load', () => {
    const savedUsername = localStorage.getItem('username');
    const savedPassword = localStorage.getItem('password');
    if (savedUsername && savedPassword) {
        username = savedUsername;
        showMainScreen();
    }
});

// Show main screen
function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    initializePeer();
}

// Settings Modal Handlers
mainMenuBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
chatMenuBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

copyPeerIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(peer.id);
    showPopup('Peer ID copied to clipboard!');
});

// Connect to Peer
connectBtn.addEventListener('click', () => {
    const friendPeerId = document.getElementById('friendPeerId').value.trim();
    if (friendPeerId) {
        conn = peer.connect(friendPeerId);
        setupConnection();
        settingsModal.classList.add('hidden');
        saveConnection(friendPeerId);
    } else {
        showPopup('Please enter a valid Peer ID');
    }
});

// Save connection
function saveConnection(peerId) {
    const savedConnections = JSON.parse(localStorage.getItem('savedConnections')) || [];
    if (!savedConnections.some(conn => conn.peerId === peerId)) {
        savedConnections.push({ peerId });
        localStorage.setItem('savedConnections', JSON.stringify(savedConnections));
    }
}

// Setup Connection
function setupConnection() {
    conn.on('open', () => {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        
        conn.on('data', (data) => {
            if (typeof data === 'object') {
                if (data.type === 'message') {
                    displayMessage(data.content, false, data.timestamp);
                    saveChatHistory(conn.peer, data.content, false, data.timestamp);
                } else if (data.type === 'username') {
                    addChatToList(conn.peer, data.content, data.profilePic);
                } else if (data.type === 'file') {
                    displayFile(data.content, data.fileName, data.fileType, false);
                    saveChatHistory(conn.peer, `File: ${data.fileName}`, false, new Date().toISOString());
                }
            }
        });

        // Send our username and profile picture to the peer
        const profilePic = localStorage.getItem('profilePic') || 'initial_dp.png';
        conn.send({ type: 'username', content: username, profilePic: profilePic });

        // Ask for the peer's username
        conn.send({ type: 'username_request' });

        // Load chat history
        loadChatHistory(conn.peer);
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        showPopup('Connection error: ' + err.message);
    });
}

// Add chat to list
function addChatToList(peerId, friendName, friendProfilePic) {
    noChatMessage.classList.add('hidden');
    const existingChat = document.querySelector(`[data-peer-id="${peerId}"]`);
    if (existingChat) return; // If chat already exists, don't add it again

    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.setAttribute('data-peer-id', peerId);
    chatItem.innerHTML = `
        <img src="${friendProfilePic || 'initial_dp.png'}" alt="${friendName}">
        <div class="chat-item-info">
            <div class="chat-item-header">
                <span class="chat-item-name">${friendName}</span>
                <span class="chat-item-time"></span>
            </div>
            <div class="chat-item-last-message"></div>
        </div>
    `;
    chatItem.addEventListener('click', () => openChat(peerId, friendName));
    chatList.appendChild(chatItem);
}

// Open chat
function openChat(peerId, friendName) {
    mainScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    document.getElementById('chatName').textContent = friendName;
    // Clear previous messages
    chatContainer.innerHTML = '';
    // Set the current connection if it's not already set to this peer
    if (!conn || conn.peer !== peerId) {
        conn = peer.connect(peerId);
        setupConnection();
    }
    // Load chat history
    loadChatHistory(peerId);
}

// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toISOString();
        if (conn && conn.open && conn.peer !== 'bytechat-ai') {
            const messageData = {
                type: 'message',
                content: message,
                timestamp: timestamp
            };
            
            conn.send(messageData);
            displayMessage(message, true, timestamp);
            updateLastMessage(conn.peer, message, timestamp);
            saveChatHistory(conn.peer, message, true, timestamp);
        } else if (document.getElementById('chatName').textContent === 'ByteChat AI') {
            displayMessage(message, true, timestamp);
            saveChatHistory('bytechat-ai', message, true, timestamp);
            sendByteChatAiMessage(message);
        }
        messageInput.value = '';
    }
}

// Display Message
function displayMessage(message, isSent, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.setAttribute('data-timestamp', timestamp);
    
    const messageContent = document.createElement('div');
    messageContent.textContent = message;
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true 
    });
    
    if (isSent) {
        const messageStatus = document.createElement('span');
        messageStatus.className = 'message-status';
        messageStatus.innerHTML = '<i class="fas fa-check-double"></i>';
        messageTime.appendChild(messageStatus);
    }
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Add long-press event listener for context menu
    let longPressTimer;
    messageDiv.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            showContextMenu(e, messageDiv);
        }, 500);
    });
    messageDiv.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, messageDiv);
    });
}

// Update last message in chat list
function updateLastMessage(peerId, message, timestamp) {
    const chatItem = document.querySelector(`[data-peer-id="${peerId}"]`);
    if (chatItem) {
        const lastMessageElement = chatItem.querySelector('.chat-item-last-message');
        const timeElement = chatItem.querySelector('.chat-item-time');
        lastMessageElement.textContent = message;
        timeElement.textContent = new Date(timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: 'numeric',
            hour12: true 
        });
    }
}

// Back Button Handler
backBtn.addEventListener('click', () => {
    chatScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
});

// File sharing
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = {
                type: 'file',
                content: event.target.result,
                fileName: file.name,
                fileType: file.type
            };
            conn.send(fileData);
            displayFile(fileData.content, fileData.fileName, fileData.fileType, true);
            saveChatHistory(conn.peer, `File: ${fileData.fileName}`, true, new Date().toISOString());
        };
        reader.readAsDataURL(file);
    }
});

// Display File
function displayFile(content, fileName, fileType, isSent) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = `media-message ${isSent ? 'sent' : 'received'}`;
    
    if (fileType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = content;
        img.alt = fileName;
        mediaDiv.appendChild(img);
    } else if (fileType.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = content;
        video.controls = true;
        mediaDiv.appendChild(video);
    } else if (fileType.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = content;
        audio.controls = true;
        mediaDiv.appendChild(audio);
    } else {
        const link = document.createElement('a');
        link.href = content;
        link.download = fileName;
        link.textContent = `Download ${fileName}`;
        mediaDiv.appendChild(link);
    }
    
    chatContainer.appendChild(mediaDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Profile Picture
profilePicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            localStorage.setItem('profilePic', event.target.result);
            updateProfilePic(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

function updateProfilePic(src) {
    const profilePics = document.querySelectorAll(`[data-peer-id="${peer.id}"] img`);
    profilePics.forEach(pic => pic.src = src);
}

// Voice and Video Calls
voiceCallBtn.addEventListener('click', () => startCall(false));
videoCallBtn.addEventListener('click', () => startCall(true));

async function startCall(isVideo) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        localVideo.srcObject = localStream;
        currentCall = peer.call(conn.peer, localStream);
        setupCallEventHandlers(currentCall);
        showCallScreen();
    } catch (err) {
        console.error('Failed to get local stream', err);
        showPopup('Failed to start call: ' + err.message);
    }
}

function handleIncomingCall(call) {
    showPopup('Incoming call. Do you want to answer?', () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(stream => {
                localStream = stream;
                localVideo.srcObject = localStream;
                call.answer(localStream);
                currentCall = call;
                setupCallEventHandlers(call);
                showCallScreen();
            })
            .catch(err => {
                console.error('Failed to get local stream', err);
                showPopup('Failed to answer call: ' + err.message);
            });
    }, () => {
        call.close();
    });
}

function setupCallEventHandlers(call) {
    call.on('stream', (stream) => {
        remoteStream = stream;
        remoteVideo.srcObject = remoteStream;
    });

    call.on('close', () => {
        endCall();
    });
}

function showCallScreen() {
    chatScreen.classList.add('hidden');
    callScreen.classList.remove('hidden');
}

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (currentCall) {
        currentCall.close();
    }
    callScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
}

toggleAudioBtn.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleAudioBtn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    }
});

toggleVideoBtn.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideoBtn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    }
});

endCallBtn.addEventListener('click', endCall);

// ByteChat AI Chat
byteChatAiBtn.addEventListener('click', () => {
    addByteChatAiChat();
    openChat('bytechat-ai', 'ByteChat AI');
});

function addByteChatAiChat() {
    const existingChat = document.querySelector('[data-peer-id="bytechat-ai"]');
    if (existingChat) return; // If ByteChat AI chat already exists, don't add it again

    noChatMessage.classList.add('hidden');
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.setAttribute('data-peer-id', 'bytechat-ai');
    chatItem.innerHTML = `
        <img src="ai_logo.png" alt="ByteChat AI">
        <div class="chat-item-info">
            <div class="chat-item-header">
                <span class="chat-item-name">ByteChat AI</span>
                <span class="chat-item-time"></span>
            </div>
            <div class="chat-item-last-message">AI-powered chat assistant</div>
        </div>
    `;
    chatItem.addEventListener('click', () => openChat('bytechat-ai', 'ByteChat AI'));
    chatList.appendChild(chatItem);
}

async function sendByteChatAiMessage(query) {
    const loadingMessage = addMessageToChat("Loading...", "bot-message");

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gemma-7b-it",
                messages: [
                    { role: "user", content: query }
                ]
            })
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(`API Error: ${errorDetails.error?.message || response.statusText}`);
        }

        const data = await response.json();
        chatContainer.removeChild(loadingMessage);

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const aiContent = data.choices[0].message.content;
            displayFormattedResponse(aiContent);
            saveChatHistory('bytechat-ai', aiContent, false, new Date().toISOString());
        } else {
            addMessageToChat("No response found. Please try a different question.", "bot-message");
        }
    } catch (error) {
        chatContainer.removeChild(loadingMessage);
        addMessageToChat("Error: " + error.message, "bot-message");
    }
}

function displayFormattedResponse(content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    
    const codeRegex = /```(.*?)```/gs;
    const parts = content.split(codeRegex);

    parts.forEach((part, index) => {
        if (index % 2 === 0) {
            // Regular text
            const textNode = document.createTextNode(part);
            messageDiv.appendChild(textNode);
        } else {
            // Code block
            const codeBlock = document.createElement("pre");
            codeBlock.className = "language-html";
            codeBlock.textContent = part;
            messageDiv.appendChild(codeBlock);
        }
    });

    chatContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: "smooth" });
}

function addMessageToChat(content, className) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: "smooth" });
    return messageDiv;
}

// Save chat history
function saveChatHistory(peerId, message, isSent, timestamp) {
    const chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${peerId}`)) || [];
    chatHistory.push({ message, isSent, timestamp });
    localStorage.setItem(`chatHistory_${peerId}`, JSON.stringify(chatHistory));
}

// Load chat history
function loadChatHistory(peerId) {
    const chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${peerId}`)) || [];
    chatHistory.forEach(item => {
        displayMessage(item.message, item.isSent, item.timestamp);
    });
}

// Show popup
function showPopup(message, onConfirm, onCancel) {
    popupMessage.textContent = message;
    popup.classList.remove('hidden');

    if (onConfirm && onCancel) {
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            popup.classList.add('hidden');
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            onCancel();
            popup.classList.add('hidden');
        });

        popupCloseBtn.replaceWith(confirmBtn);
        confirmBtn.after(cancelBtn);
    } else {
        popupCloseBtn.addEventListener('click', () => {
            popup.classList.add('hidden');
        });
    }
}

// Show context menu
function showContextMenu(event, messageElement) {
    event.preventDefault();
    const rect = messageElement.getBoundingClientRect();
    contextMenu.style.top = `${rect.bottom}px`;
    contextMenu.style.left = `${rect.left}px`;
    contextMenu.classList.remove('hidden');

    const closeContextMenu = () => {
        contextMenu.classList.add('hidden');
        document.removeEventListener('click', closeContextMenu);
    };

    document.addEventListener('click', closeContextMenu);

    copyMessageBtn.onclick = () => {
        const messageContent = messageElement.querySelector('div').textContent;
        navigator.clipboard.writeText(messageContent);
        showPopup('Message copied to clipboard');
        closeContextMenu();
    };

    deleteMessageBtn.onclick = () => {
        messageElement.remove();
        // Remove from chat history
        const peerId = conn ? conn.peer : 'bytechat-ai';
        const timestamp = messageElement.getAttribute('data-timestamp');
        removeChatHistoryItem(peerId, timestamp);
        closeContextMenu();
    };
}

// Remove chat history item
function removeChatHistoryItem(peerId, timestamp) {
    const chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${peerId}`)) || [];
    const updatedHistory = chatHistory.filter(item => item.timestamp !== timestamp);
    localStorage.setItem(`chatHistory_${peerId}`, JSON.stringify(updatedHistory));
}

// Handle voice message button long press
let voiceRecording = false;
let pressTimer;

sendBtn.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
        voiceRecording = true;
        sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        // Add voice recording logic here
    }, 500);
});

sendBtn.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
    if (voiceRecording) {
        voiceRecording = false;
        sendBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        // Add stop recording logic here
    }
});

// Prevent context menu on long press
sendBtn.addEventListener('contextmenu', (e) => e.preventDefault());

// Initialize the app
window.addEventListener('load', () => {
    const savedUsername = localStorage.getItem('username');
    const savedPassword = localStorage.getItem('password');
    if (savedUsername && savedPassword) {
        username = savedUsername;
        showMainScreen();
    }
});

