let html5QrCode;
let isScanning = false;

const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const scannerContainer = document.getElementById('scanner-container');
const resultContainer = document.getElementById('result-container');
const errorMessage = document.getElementById('error-message');

startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', resetScanner);

async function startScanner() {
    try {
        // Check if HTTPS
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            showError('Camera access requires HTTPS. Please use: https://dreamy-manatee-4cac82.netlify.app');
            return;
        }

        // Check if getUserMedia is supported
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
        startBtn.textContent = 'Start Scanner';
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
    // Ignore scan errors (they happen continuously while scanning)
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

async function lookupProduct(barcode) {
    scannerContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    document.getElementById('product-name').textContent = 'Looking up product...';
    document.getElementById('product-brand').textContent = '';
    document.getElementById('product-barcode').textContent = `Barcode: ${barcode}`;
    document.getElementById('product-image').className = 'no-image';
    document.getElementById('product-image').innerHTML = '';

    try {
        // Try Open Food Facts first
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            displayProduct(data.product, barcode);
        } else {
            // Fallback: Try UPCitemdb
            const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
            const upcData = await upcResponse.json();

            if (upcData.items && upcData.items.length > 0) {
                displayUPCProduct(upcData.items[0], barcode);
            } else {
                displayUnknownProduct(barcode);
            }
        }
    } catch (err) {
        console.error('Error looking up product:', err);
        displayUnknownProduct(barcode);
    }
}

function displayProduct(product, barcode) {
    document.getElementById('product-name').textContent = product.product_name || 'Unknown Product';
    document.getElementById('product-brand').textContent = product.brands || '';
    document.getElementById('product-barcode').textContent = `Barcode: ${barcode}`;

    const imageContainer = document.getElementById('product-image');
    if (product.image_url) {
        imageContainer.className = '';
        imageContainer.innerHTML = `<img src="${product.image_url}" alt="${product.product_name}">`;
    } else {
        imageContainer.className = 'no-image';
        imageContainer.innerHTML = '';
    }
}

function displayUPCProduct(product, barcode) {
    document.getElementById('product-name').textContent = product.title || 'Unknown Product';
    document.getElementById('product-brand').textContent = product.brand || '';
    document.getElementById('product-barcode').textContent = `Barcode: ${barcode}`;

    const imageContainer = document.getElementById('product-image');
    if (product.images && product.images.length > 0) {
        imageContainer.className = '';
        imageContainer.innerHTML = `<img src="${product.images[0]}" alt="${product.title}">`;
    } else {
        imageContainer.className = 'no-image';
        imageContainer.innerHTML = '';
    }
}

function displayUnknownProduct(barcode) {
    document.getElementById('product-name').textContent = 'Product Not Found';
    document.getElementById('product-brand').textContent = 'This barcode is not in our database';
    document.getElementById('product-barcode').textContent = `Barcode: ${barcode}`;
    document.getElementById('product-image').className = 'no-image';
    document.getElementById('product-image').innerHTML = '';
}

function resetScanner() {
    resultContainer.classList.add('hidden');
    scannerContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    startBtn.style.display = 'block';
    startBtn.textContent = 'Start Scanner';
    startBtn.disabled = false;
}

function showError(message) {
    errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    errorMessage.classList.remove('hidden');
}
