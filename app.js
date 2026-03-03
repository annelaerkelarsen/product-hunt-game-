// Game state
let currentPlayer = null;
let playerId = null;
let html5QrCode = null;
let isScanning = false;
const WINNING_SCORE = 3;
let useLocalStorage = true; // Will try Firebase, fallback to localStorage

// Try to load Firebase
let database = null;
let firebaseLoaded = false;
let fbRef = null;
let fbSet = null;
let fbOnValue = null;
let fbRemove = null;

async function initFirebase() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        const { getDatabase, ref, set, onValue, remove } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');

        // Your Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCQG8tgmTPc-fVxRVC58K6SzpJLslNs1Ro",
            authDomain: "product-hunt-e4fe2.firebaseapp.com",
            databaseURL: "https://product-hunt-e4fe2-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "product-hunt-e4fe2",
            storageBucket: "product-hunt-e4fe2.firebasestorage.app",
            messagingSenderId: "384788937211",
            appId: "1:384788937211:web:c86616187e223d7647335e"
        };

        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);

        fbRef = ref;
        fbSet = set;
        fbOnValue = onValue;
        fbRemove = remove;

        useLocalStorage = false;
        firebaseLoaded = true;
        console.log('✅ Firebase connected - Multiplayer enabled');
    } catch (error) {
        console.warn('⚠️ Firebase not configured - Using localStorage (single-player mode)');
        console.log('To enable multiplayer: See FIREBASE_SETUP.md');
        useLocalStorage = true;
        firebaseLoaded = false;
    }
}

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

// Initialize Firebase
initFirebase();

// Event listeners
joinBtn.addEventListener('click', joinGame);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});
startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', resetScanner);
newGameBtn.addEventListener('click', () => {
    if (useLocalStorage) {
        localStorage.clear();
    }
    location.reload();
});

// Join game
async function joinGame() {
    try {
        console.log('Join game clicked');
        const name = playerNameInput.value.trim();
        if (!name) {
            alert('Please enter your name');
            return;
        }

        console.log('Name entered:', name);
        playerId = 'player_' + Date.now();
        currentPlayer = {
            id: playerId,
            name: name,
            products: {},
            score: 0,
            joinedAt: Date.now(),
            lastActive: Date.now()
        };

        if (useLocalStorage) {
            console.log('Using localStorage mode');
            // LocalStorage mode
            saveToLocalStorage();
            showGameScreen();
            updateLocalLeaderboard();

            // Simulate checking for updates
            setInterval(() => {
                updateLocalLeaderboard();
            }, 1000);
        } else {
            console.log('Using Firebase mode');
            // Firebase mode
            await fbSet(fbRef(database, 'players/' + playerId), currentPlayer);
            showGameScreen();
            listenToPlayers();

            window.addEventListener('beforeunload', () => {
                fbRemove(fbRef(database, 'players/' + playerId));
            });
        }
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game: ' + error.message);
    }
}

function showGameScreen() {
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    currentPlayerEl.textContent = currentPlayer.name;

    if (useLocalStorage) {
        // Add indicator for local mode
        currentPlayerEl.innerHTML = currentPlayer.name + ' <span style="font-size: 12px; opacity: 0.7;">(Local Mode)</span>';
    }
}

// LocalStorage functions
function saveToLocalStorage() {
    const players = getLocalPlayers();
    players[playerId] = currentPlayer;
    localStorage.setItem('productHuntPlayers', JSON.stringify(players));
}

function getLocalPlayers() {
    const data = localStorage.getItem('productHuntPlayers');
    return data ? JSON.parse(data) : {};
}

function updateLocalLeaderboard() {
    const players = getLocalPlayers();
    updateLeaderboard(players);
    checkForWinner(players);

    if (players[playerId]) {
        const score = players[playerId].score || 0;
        playerScoreEl.textContent = score + '/3';
        collectionCountEl.textContent = score;
        updateMyCollection(players[playerId].products || {});
    }
}

// Firebase listeners
function listenToPlayers() {
    const playersRef = fbRef(database, 'players');
    fbOnValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        // Clean up inactive players (no activity in 3 minutes)
        const now = Date.now();
        const INACTIVE_THRESHOLD = 3 * 60 * 1000; // 3 minutes

        Object.entries(players).forEach(([id, player]) => {
            const lastActive = player.lastActive || player.joinedAt || 0;
            if (now - lastActive > INACTIVE_THRESHOLD && id !== playerId) {
                console.log('Removing inactive player:', player.name);
                fbRemove(fbRef(database, 'players/' + id));
            }
        });

        updateLeaderboard(players);
        checkForWinner(players);

        if (players[playerId]) {
            const score = players[playerId].score || 0;
            playerScoreEl.textContent = score + '/3';
            collectionCountEl.textContent = score;
            updateMyCollection(players[playerId].products || {});
        }
    });

    // Keep current player active
    setInterval(() => {
        if (playerId && database) {
            fbSet(fbRef(database, 'players/' + playerId + '/lastActive'), Date.now());
        }
    }, 30000); // Update every 30 seconds
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
            showError('Camera access requires HTTPS.');
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
            fps: 15,
            qrbox: { width: 250, height: 120 },
            // Support all barcode formats
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
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
            errorMsg += 'Make sure you are using HTTPS';
        } else {
            errorMsg += 'Try: Settings > Safari > Camera = Ask';
        }

        showError(errorMsg);
        startBtn.textContent = 'Start Scanning';
        startBtn.disabled = false;
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('Barcode detected:', decodedText, 'isScanning:', isScanning);
    if (isScanning) {
        isScanning = false;
        stopScanner();
        lookupProduct(decodedText);
    } else {
        console.warn('Scan detected but isScanning was false');
    }
}

function onScanError(errorMessage) {
    // Ignore scan errors
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            await html5QrCode.clear();
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
    }
    html5QrCode = null;
    console.log('Scanner stopped and cleared');
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
        // Try Open Food Facts first
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
            // Fallback: Try UPCitemdb
            try {
                const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
                const upcData = await upcResponse.json();

                if (upcData.items && upcData.items.length > 0) {
                    const item = upcData.items[0];
                    const product = {
                        barcode: barcode,
                        name: item.title || 'Unknown Product',
                        brand: item.brand || '',
                        image: (item.images && item.images.length > 0) ? item.images[0] : null
                    };
                    addProductToCollection(product);
                } else {
                    // No product found in either database
                    const product = {
                        barcode: barcode,
                        name: 'Unknown Product',
                        brand: 'Barcode: ' + barcode,
                        image: null
                    };
                    addProductToCollection(product);
                }
            } catch (upcErr) {
                console.error('UPC lookup error:', upcErr);
                const product = {
                    barcode: barcode,
                    name: 'Unknown Product',
                    brand: 'Barcode: ' + barcode,
                    image: null
                };
                addProductToCollection(product);
            }
        }
    } catch (err) {
        console.error('Error looking up product:', err);
        const product = {
            barcode: barcode,
            name: 'Unknown Product',
            brand: 'Barcode: ' + barcode,
            image: null
        };
        addProductToCollection(product);
    }
}

// Add product to collection
function addProductToCollection(product) {
    if (useLocalStorage) {
        const players = getLocalPlayers();
        const playerData = players[playerId];
        const products = playerData.products || {};

        if (products[product.barcode]) {
            displayProduct(product, true);
        } else {
            products[product.barcode] = product;
            playerData.products = products;
            playerData.score = Object.keys(products).length;
            players[playerId] = playerData;
            currentPlayer = playerData;

            localStorage.setItem('productHuntPlayers', JSON.stringify(players));
            displayProduct(product, false);
            updateLocalLeaderboard();
        }
    } else {
        const playerRef = fbRef(database, 'players/' + playerId);
        fbOnValue(playerRef, (snapshot) => {
            const playerData = snapshot.val();
            if (!playerData) return;

            const products = playerData.products || {};

            if (products[product.barcode]) {
                displayProduct(product, true);
            } else {
                products[product.barcode] = product;
                const score = Object.keys(products).length;

                fbSet(fbRef(database, 'players/' + playerId), {
                    ...playerData,
                    products: products,
                    score: score,
                    lastActive: Date.now()
                });

                displayProduct(product, false);
            }
        }, { onlyOnce: true });
    }
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
    console.log('Resetting scanner');
    isScanning = false;
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
