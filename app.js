// Game state
let currentPlayer = null;
let playerId = null;
let html5QrCode = null;
let isScanning = false;
const WINNING_SCORE = 3;
let useLocalStorage = true; // Will try Firebase, fallback to localStorage

// API Configuration for multi-provider waterfall
const API_CONFIG = {
  apis: [
    {
      name: 'openfoodfacts',
      endpoint: 'https://world.openfoodfacts.org/api/v0/product/{barcode}.json',
      requiresKey: false,
      parseResponse: (data) => ({
        name: data.product.product_name,
        brand: data.product.brands,
        image: data.product.image_url
      }),
      isSuccess: (data) => data.status === 1
    },
    {
      name: 'goupc',
      endpoint: 'https://go-upc.com/api/v1/code/{barcode}',
      requiresKey: true,
      apiKey: localStorage.getItem('goupc-key'),
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
      parseResponse: (data) => ({
        name: data.product?.name,
        brand: data.product?.brand,
        image: data.product?.imageUrl
      }),
      isSuccess: (data) => data.product?.name
    },
    {
      name: 'eansearch',
      endpoint: 'https://api.ean-search.org/api?op=barcode-lookup&barcode={barcode}&format=json',
      requiresKey: false,
      parseResponse: (data) => ({
        name: data[0]?.name,
        brand: data[0]?.categoryName,
        image: data[0]?.imageUrl
      }),
      isSuccess: (data) => data?.length > 0
    },
    {
      name: 'upcsearch',
      endpoint: 'https://api.upc-search.org/barcode/{barcode}',
      requiresKey: false,
      parseResponse: (data) => ({
        name: data.product_name,
        brand: data.brand,
        image: data.image_url
      }),
      isSuccess: (data) => data.product_name
    },
    {
      name: 'barcodelookup',
      endpoint: 'https://api.barcodelookup.com/v3/products?barcode={barcode}&key={apiKey}',
      requiresKey: true,
      apiKey: localStorage.getItem('barcodelookup-key'),
      parseResponse: (data) => ({
        name: data.products?.[0]?.title,
        brand: data.products?.[0]?.brand,
        image: data.products?.[0]?.images?.[0]
      }),
      isSuccess: (data) => data.products?.length > 0
    },
    {
      name: 'upcitemdb',
      endpoint: 'https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}',
      requiresKey: false,
      parseResponse: (data) => ({
        name: data.items?.[0]?.title,
        brand: data.items?.[0]?.brand,
        image: data.items?.[0]?.images?.[0]
      }),
      isSuccess: (data) => data.items?.length > 0
    }
  ],
  timeout: 5000,
  cacheSuccessTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  cacheFailureTTL: 24 * 60 * 60 * 1000 // 24 hours
};

// Cache Functions
function checkCache(barcode) {
  const cache = JSON.parse(localStorage.getItem('productCache') || '{}');
  const cached = cache[barcode];
  if (cached && cached.expiresAt > Date.now()) {
    console.log('Cache hit:', barcode);
    return cached.product;
  }
  return null;
}

function cacheProduct(barcode, product, source) {
  const cache = JSON.parse(localStorage.getItem('productCache') || '{}');
  cache[barcode] = {
    product,
    source,
    cachedAt: Date.now(),
    expiresAt: Date.now() + API_CONFIG.cacheSuccessTTL
  };
  localStorage.setItem('productCache', JSON.stringify(cache));
}

function cacheFailure(barcode) {
  const failures = JSON.parse(localStorage.getItem('productFailures') || '{}');
  failures[barcode] = {
    attempts: (failures[barcode]?.attempts || 0) + 1,
    lastAttempt: Date.now(),
    expiresAt: Date.now() + API_CONFIG.cacheFailureTTL
  };
  localStorage.setItem('productFailures', JSON.stringify(failures));
}

function isRecentFailure(barcode) {
  const failures = JSON.parse(localStorage.getItem('productFailures') || '{}');
  const failure = failures[barcode];
  return failure && failure.expiresAt > Date.now();
}

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
const manualBarcodeInput = document.getElementById('manual-barcode');
const manualSubmitBtn = document.getElementById('manual-submit-btn');

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
manualSubmitBtn.addEventListener('click', () => {
    const barcode = manualBarcodeInput.value.trim();
    if (barcode) {
        console.log('Manual barcode entry:', barcode);
        manualBarcodeInput.value = '';
        lookupProduct(barcode);
    }
});
manualBarcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        manualSubmitBtn.click();
    }
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

        // Try native BarcodeDetector first (better performance)
        if ('BarcodeDetector' in window) {
            console.log('Using native BarcodeDetector');
            await startNativeBarcodeDetector();
        } else {
            console.log('Falling back to html5-qrcode');
            html5QrCode = new Html5Qrcode("reader");

            const config = {
                fps: 20,  // Increased from 15
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    return {
                        width: Math.floor(minEdgeSize * 0.75),
                        height: Math.floor(minEdgeSize * 0.28)
                    };
                },
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                showZoomSliderIfSupported: true,
                defaultZoomValueIfSupported: 2,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39
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
        }

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

// Native barcode detector (better than html5-qrcode)
let videoStream = null;
let barcodeDetector = null;
let detectionInterval = null;

async function startNativeBarcodeDetector() {
    const video = document.createElement('video');
    video.setAttribute('playsinline', true);
    video.style.width = '100%';
    video.style.borderRadius = '12px';

    const readerDiv = document.getElementById('reader');
    readerDiv.innerHTML = '';
    readerDiv.appendChild(video);

    // Request higher resolution and zoom capability
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 },
                zoom: true,
                focusMode: 'continuous',
                aspectRatio: { ideal: 16/9 }
            }
        });
    } catch (err) {
        // Fallback to basic constraints if advanced features not supported
        console.log('Advanced constraints not supported, using basic');
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
    }

    video.srcObject = videoStream;
    await video.play();

    // Check capabilities and settings
    const videoTrack = videoStream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();

    console.log('Camera capabilities:', capabilities);
    console.log('Active video settings:', {
        width: settings.width,
        height: settings.height,
        aspectRatio: settings.aspectRatio,
        facingMode: settings.facingMode
    });

    // Setup zoom controls if supported
    if (capabilities.zoom) {
        setupZoomControls(videoTrack, capabilities.zoom);
    }

    // Setup torch/flashlight if supported
    if (capabilities.torch) {
        setupTorchControl(videoTrack);
    }

    barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
    });

    isScanning = true;
    startBtn.style.display = 'none';

    // Show scan box overlay
    const scanBoxOverlay = document.getElementById('scan-box-overlay');
    if (scanBoxOverlay) {
        scanBoxOverlay.style.display = 'flex';
    }

    // Update feedback text
    updateScanFeedback('Searching for barcode...', 'searching');

    let detectionCount = 0;
    let lastBarcode = null;

    // FASTER DETECTION: 100ms = 10 FPS (was 200ms = 5 FPS)
    detectionInterval = setInterval(async () => {
        if (!isScanning) return;

        try {
            const barcodes = await barcodeDetector.detect(video);

            if (barcodes.length > 0) {
                const barcode = barcodes[0];
                console.log('Detected:', barcode.format, barcode.rawValue);

                // Visual and haptic feedback
                updateScanFeedback('Barcode found - hold steady!', 'found');

                // Vibrate if supported
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }

                // Require 1 consecutive detection (reduced from 2 for better responsiveness)
                if (lastBarcode === barcode.rawValue) {
                    detectionCount++;
                } else {
                    lastBarcode = barcode.rawValue;
                    detectionCount = 1;
                }

                if (detectionCount >= 1 && isScanning) {
                    isScanning = false;
                    updateScanFeedback('✓ Scanned!', 'success');

                    // Final vibration
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }

                    setTimeout(() => {
                        stopNativeBarcodeDetector();
                        onScanSuccess(barcode.rawValue);
                    }, 500);
                }
            } else {
                // Reset if no barcode detected
                if (detectionCount > 0) {
                    detectionCount = 0;
                    lastBarcode = null;
                    updateScanFeedback('Searching for barcode...', 'searching');
                }
            }
        } catch (err) {
            console.error('Detection error:', err);
        }
    }, 100); // Changed from 200ms to 100ms
}

function updateScanFeedback(message, state) {
    const feedback = document.getElementById('scan-feedback');
    const scanBox = document.querySelector('.scan-box');

    if (feedback) {
        feedback.textContent = message;
        feedback.className = 'scan-feedback ' + state;
    }

    if (scanBox) {
        scanBox.className = 'scan-box ' + state;
    }
}

function stopNativeBarcodeDetector() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    // Hide scan box overlay
    const scanBoxOverlay = document.getElementById('scan-box-overlay');
    if (scanBoxOverlay) scanBoxOverlay.style.display = 'none';

    // Hide zoom controls
    const zoomControls = document.getElementById('zoom-controls');
    if (zoomControls) zoomControls.style.display = 'none';

    // Hide flashlight
    const flashBtn = document.getElementById('flashlight-btn');
    if (flashBtn) flashBtn.style.display = 'none';

    const readerDiv = document.getElementById('reader');
    readerDiv.innerHTML = '';

    console.log('Native detector stopped');
}

// Zoom Control Functions
let currentZoom = 1.0;
let videoTrackForZoom = null;

function setupZoomControls(videoTrack, zoomCapabilities) {
    videoTrackForZoom = videoTrack;

    const zoomControls = document.getElementById('zoom-controls');
    if (!zoomControls) return;

    zoomControls.style.display = 'flex';

    const slider = document.getElementById('zoom-slider');
    slider.min = zoomCapabilities.min || 1;
    slider.max = zoomCapabilities.max || 3;
    slider.step = 0.1;
    slider.value = currentZoom;

    slider.addEventListener('input', (e) => {
        setZoom(parseFloat(e.target.value));
    });

    document.getElementById('zoom-in')?.addEventListener('click', () => {
        const newZoom = Math.min(currentZoom + 0.5, zoomCapabilities.max);
        setZoom(newZoom);
        slider.value = newZoom;
    });

    document.getElementById('zoom-out')?.addEventListener('click', () => {
        const newZoom = Math.max(currentZoom - 0.5, zoomCapabilities.min);
        setZoom(newZoom);
        slider.value = newZoom;
    });
}

function setZoom(level) {
    if (videoTrackForZoom) {
        videoTrackForZoom.applyConstraints({
            advanced: [{ zoom: level }]
        });
        currentZoom = level;
        const levelEl = document.getElementById('zoom-level');
        if (levelEl) levelEl.textContent = level.toFixed(1) + 'x';
    }
}

function setupTorchControl(videoTrack) {
    const torchBtn = document.getElementById('flashlight-btn');
    if (!torchBtn) return;

    torchBtn.style.display = 'block';
    let torchEnabled = false;

    torchBtn.addEventListener('click', () => {
        torchEnabled = !torchEnabled;
        videoTrack.applyConstraints({
            advanced: [{ torch: torchEnabled }]
        });
        torchBtn.classList.toggle('active', torchEnabled);
    });
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
    // Stop native detector if running
    if (detectionInterval || videoStream) {
        stopNativeBarcodeDetector();
    }

    // Stop html5-qrcode if running
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

// Lookup product with multi-API waterfall
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
        // Check cache first
        const cached = checkCache(barcode);
        if (cached) {
            addProductToCollection(cached);
            return;
        }

        // Check if we've failed this recently
        if (isRecentFailure(barcode)) {
            console.log('Recent failure, skipping API calls');
            addProductToCollection(createUnknownProduct(barcode));
            return;
        }

        // Try API waterfall
        for (const api of API_CONFIG.apis) {
            if (api.requiresKey && !api.apiKey) {
                console.log(`Skipping ${api.name} - no API key`);
                continue;
            }

            try {
                const url = api.endpoint.replace('{barcode}', barcode).replace('{apiKey}', api.apiKey || '');
                const headers = api.headers ? api.headers(api.apiKey) : {};

                console.log(`Trying ${api.name}...`);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

                const response = await fetch(url, {
                    headers,
                    signal: controller.signal
                });
                clearTimeout(timeout);

                const data = await response.json();

                if (api.isSuccess(data)) {
                    const parsed = api.parseResponse(data);
                    const product = {
                        barcode,
                        name: parsed.name || 'Unknown Product',
                        brand: parsed.brand || '',
                        image: parsed.image || null
                    };

                    console.log(`✓ Found in ${api.name}:`, product);
                    cacheProduct(barcode, product, api.name);
                    addProductToCollection(product);
                    return;
                }
            } catch (err) {
                console.log(`${api.name} failed:`, err.message);
                continue;
            }
        }

        // All APIs failed
        console.log('All APIs failed for barcode:', barcode);
        cacheFailure(barcode);
        addProductToCollection(createUnknownProduct(barcode));

    } catch (err) {
        console.error('Error in lookupProduct:', err);
        addProductToCollection(createUnknownProduct(barcode));
    }
}

function createUnknownProduct(barcode) {
    return {
        barcode,
        name: 'Unknown Product',
        brand: `Barcode: ${barcode}`,
        image: null
    };
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

// Save API Keys
function saveAPIKeys() {
    const goupckKey = document.getElementById('goupc-key')?.value.trim();
    const barcodelookupKey = document.getElementById('barcodelookup-key')?.value.trim();

    if (goupckKey) localStorage.setItem('goupc-key', goupckKey);
    if (barcodelookupKey) localStorage.setItem('barcodelookup-key', barcodelookupKey);

    alert('API keys saved! They will be used for product lookups.');
}

// Show error
function showError(message) {
    errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    errorMessage.classList.remove('hidden');
}
