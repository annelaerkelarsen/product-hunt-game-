// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, onValue, push, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyBvK8xM5_5h8L3pQ7Z3J6yH8K8F8wZq4xM",
    authDomain: "product-hunt-game.firebaseapp.com",
    databaseURL: "https://product-hunt-game-default-rtdb.firebaseio.com",
    projectId: "product-hunt-game",
    storageBucket: "product-hunt-game.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Game state
let currentPlayer = null;
let playerId = null;
let html5QrCode = null;
let isScanning = false;
const WINNING_SCORE = 3;

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const winnerScreen = document.getElementById('winner-screen');
const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const currentPlayerEl = document.getElementById('current-player');
const playerScoreEl = document.getElementById('player-score');
const playersListEl = document.getElementById('players-list');
const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const scannerContainer = document.getElementById('scanner-container');
const resultContainer = document.getElementById('result-container');
const errorMessage = document.getElementById('error-message');
const collectionListEl = document.getElementById('collection-list');
const collectionCountEl = document.getElementById('collection-count');
const scanStatusEl = document.getElementById('scan-status');
const winnerNameEl = document.getElementById('winner-name');
const newGameBtn = document.getElementById('new-game-btn');

// Event listeners
joinBtn.addEventListener('click', joinGame);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});
startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', resetScanner);
newGameBtn.addEventListener('click', () => location.reload());

// Join game
function joinGame() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }

    playerId = 'player_' + Date.now();
    currentPlayer = {
        id: playerId,
        name: name,
        products: {},
        score: 0,
        joinedAt: Date.now()
    };

    // Save player to Firebase
    set(ref(database, 'players/' + playerId), currentPlayer);

    // Show game screen
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    currentPlayerEl.textContent = name;

    // Listen for player updates
    listenToPlayers();

    // Clean up on disconnect
    window.addEventListener('beforeunload', () => {
        remove(ref(database, 'players/' + playerId));
    });
}

// Listen to all players
function listenToPlayers() {
    const playersRef = ref(database, 'players');
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        updateLeaderboard(players);
        checkForWinner(players);

        // Update current player score
        if (players[playerId]) {
            const score = players[playerId].score || 0;
            playerScoreEl.textContent = score + '/3';
            collectionCountEl.textContent = score;
            updateMyCollection(players[playerId].products || {});
        }
    });
}

// Update leaderboard
function updateLeaderboard(players) {
    const playerArray = Object.values(players);
    playerArray.sort((a, b) => (b.score || 0) - (a.score || 0));

    playersListEl.innerHTML = '';
    playerArray.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        if (player.id === playerId) playerDiv.classList.add('me');
        if (player.score >= WINNING_SCORE) playerDiv.classList.add('winner');

        const score = player.score || 0;
        const dots = Array(3).fill(0).map((_, i) =>
            `<div class="product-dot ${i < score ? 'filled' : ''}"></div>`
        ).join('');

        playerDiv.innerHTML = `
            <span class="player-name">${player.name}</span>
            <div class="player-progress">${dots}</div>
        `;
        playersListEl.appendChild(playerDiv);
    });
}

// Check for winner
function checkForWinner(players) {
    const winner = Object.values(players).find(p => p.score >= WINNING_SCORE);
    if (winner) {
        showWinner(winner);
    }
}

// Show winner screen
function showWinner(winner) {
    gameScreen.classList.add('hidden');
    winnerScreen.classList.remove('hidden');
    winnerNameEl.textContent = winner.name;

    if (html5QrCode) {
        stopScanner();
    }
}

// Update my collection display
function updateMyCollection(products) {
    collectionListEl.innerHTML = '';
    Object.values(products).forEach(product => {
        const item = document.createElement('div');
        item.className = 'collection-item';

        const imageDiv = document.createElement('div');
        imageDiv.className = 'collection-item-image';
        if (product.image) {
            imageDiv.innerHTML = `<img src="${product.image}" alt="${product.name}">`;
        } else {
            imageDiv.textContent = '📦';
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'collection-item-name';
        nameDiv.textContent = product.name;

        item.appendChild(imageDiv);
        item.appendChild(nameDiv);
        collectionListEl.appendChild(item);
    });
}

// Start scanner
async function startScanner() {
    try {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            showError('Camera access requires HTTPS. Please use: https://dreamy-manatee-4cac82.netlify.app');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Your browser does not support camera access. Please use Safari on iOS.');
            return;
        }

        startBtn.textContent = 'Starting camera...';
        startBtn.disabled = true;

        html5QrCode = new Html5Qrcode("reader");

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };

        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanError
        );

        isScanning = true;
        startBtn.style.display = 'none';

    } catch (err) {
        console.error('Error starting scanner:', err);
        let errorMsg = 'Could not access camera.\n\n';

        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
            errorMsg += 'Fix: Safari Settings > Privacy > Camera > Allow this site';
        } else if (err.name === 'NotFoundError') {
            errorMsg += 'No camera found on this device.';
        } else if (err.message.includes('secure')) {
            errorMsg += 'Make sure you are using HTTPS (https://dreamy-manatee-4cac82.netlify.app)';
        } else {
            errorMsg += 'Try: Settings > Safari > Camera = Ask';
        }

        showError(errorMsg);
        startBtn.textContent = 'Start Scanning';
        startBtn.disabled = false;
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (isScanning) {
        isScanning = false;
        stopScanner();
        lookupProduct(decodedText);
    }
}

function onScanError(errorMessage) {
    // Ignore scan errors
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
    }
}

// Lookup product
async function lookupProduct(barcode) {
    scannerContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    document.getElementById('product-name').textContent = 'Looking up product...';
    document.getElementById('product-brand').textContent = '';
    document.getElementById('product-image').className = 'no-image';
    document.getElementById('product-image').innerHTML = '';
    scanStatusEl.className = '';
    scanStatusEl.textContent = '';

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = {
                barcode: barcode,
                name: data.product.product_name || 'Unknown Product',
                brand: data.product.brands || '',
                image: data.product.image_url || null
            };
            addProductToCollection(product);
        } else {
            const product = {
                barcode: barcode,
                name: 'Unknown Product',
                brand: '',
                image: null
            };
            addProductToCollection(product);
        }
    } catch (err) {
        console.error('Error looking up product:', err);
        const product = {
            barcode: barcode,
            name: 'Unknown Product',
            brand: '',
            image: null
        };
        addProductToCollection(product);
    }
}

// Add product to collection
function addProductToCollection(product) {
    const playerRef = ref(database, 'players/' + playerId);
    onValue(playerRef, (snapshot) => {
        const playerData = snapshot.val();
        if (!playerData) return;

        const products = playerData.products || {};

        // Check if already scanned
        if (products[product.barcode]) {
            displayProduct(product, true);
        } else {
            // Add new product
            products[product.barcode] = product;
            const score = Object.keys(products).length;

            set(ref(database, 'players/' + playerId), {
                ...playerData,
                products: products,
                score: score
            });

            displayProduct(product, false);
        }
    }, { onlyOnce: true });
}

// Display product
function displayProduct(product, isDuplicate) {
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-brand').textContent = product.brand;

    const imageContainer = document.getElementById('product-image');
    if (product.image) {
        imageContainer.className = '';
        imageContainer.innerHTML = `<img src="${product.image}" alt="${product.name}">`;
    } else {
        imageContainer.className = 'no-image';
        imageContainer.innerHTML = '';
    }

    if (isDuplicate) {
        scanStatusEl.className = 'duplicate';
        scanStatusEl.textContent = 'Already scanned! Find a different product.';
    } else {
        scanStatusEl.className = 'success';
        scanStatusEl.textContent = '✓ Added to your collection!';
    }
}

// Reset scanner
function resetScanner() {
    resultContainer.classList.add('hidden');
    scannerContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    startBtn.style.display = 'block';
    startBtn.textContent = 'Start Scanning';
    startBtn.disabled = false;
}

// Show error
function showError(message) {
    errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    errorMessage.classList.remove('hidden');
}
