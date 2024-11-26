const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const accountScreen = document.getElementById('accountScreen');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const displayUsername = document.getElementById('displayUsername');
const peerIdDisplay = document.getElementById('peerIdDisplay');
const copyPeerIdBtn = document.getElementById('copyPeerIdBtn');
const connectBtn = document.getElementById('connectBtn');
const peerIdInput = document.getElementById('peerIdInput');
const chatPageBtn = document.getElementById('chatPageBtn');
const accountPageBtn = document.getElementById('accountPageBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatBody = document.getElementById('chatBody');

// Initialize PeerJS
const peer = new Peer(localStorage.getItem('peerId') || undefined);

// Persistent Peer ID
peer.on('open', (id) => {
  localStorage.setItem('peerId', id);
  peerIdDisplay.textContent = id;
});

// Persistent Login
if (localStorage.getItem('username')) {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  displayUsername.textContent = localStorage.getItem('username');
}

// Login functionality
// Login button click handler
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (username && password) {
    // Validate credentials (optional)
    loginScreen.style.display = 'none'; // Hide login screen
    login_background.style.display = 'none';
    mainApp.style.display = 'block'; // Show main app
    displayUsername.textContent = username; // Set username in Account tab
  } else {
    alert('Please enter valid username and password!');
  }
});


// Copy Peer ID
copyPeerIdBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(peerIdDisplay.textContent).then(() => {
    alert('Byte Code copied to clipboard!');
  });
});

// Navigation
chatPageBtn.addEventListener('click', () => {
  accountScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
});

accountPageBtn.addEventListener('click', () => {
  chatScreen.classList.add('hidden');
  accountScreen.classList.remove('hidden');
});

// Peer Connection
connectBtn.addEventListener('click', () => {
  const peerId = peerIdInput.value.trim();
  if (peerId) {
    const conn = peer.connect(peerId);
    conn.on('open', () => {
      messageInput.disabled = false;
      sendBtn.disabled = false;
      conn.on('data', (data) => displayMessage(data, 'other'));
      sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
          conn.send(message);
          displayMessage(message, 'self');
          messageInput.value = '';
        }
      });
    });
  } else {
    alert('Please enter a valid Peer ID!');
  }
});

// Display Message
function displayMessage(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

