# Barcode Scanner Web App

A mobile-friendly web app that scans barcodes and identifies products using your iPhone camera.

## Features

- Scan EAN, UPC, Code 128, Code 39, and QR codes
- Product lookup via Open Food Facts and UPCitemdb APIs
- Works on iPhone Safari (iOS 14+)
- No app store installation required
- Clean, simple interface

## How to Use

### Option 1: Open Directly (Simplest)
1. Open `index.html` in Safari on your iPhone
2. Allow camera access when prompted
3. Tap "Start Scanner"
4. Point camera at a barcode
5. Product info appears automatically

### Option 2: Serve Locally (Better camera support)
1. In this folder, run:
   ```bash
   python3 -m http.server 8000
   ```
2. On your iPhone, go to Safari
3. Navigate to: `http://[your-computer-ip]:8000`
4. Follow steps 2-5 above

### Option 3: Deploy to Web
Upload to any web hosting (Netlify, Vercel, GitHub Pages) for permanent URL.

## Camera Access

On first use, Safari will ask for camera permission. You must allow this for the scanner to work.

## Supported Barcodes

- EAN-13 (most common in Europe)
- EAN-8
- UPC-A (most common in US)
- UPC-E
- Code 128
- Code 39
- QR codes

## Product Databases

- **Open Food Facts**: Free, extensive food product database
- **UPCitemdb**: Fallback for non-food items (limited in trial mode)

## Troubleshooting

**Camera won't start:**
- Check Safari Settings > [This Site] > Camera = Allow
- Try refreshing the page
- Make sure you're using HTTPS or localhost

**Product not found:**
- Some barcodes aren't in public databases
- Try scanning a common food product to test

**Scanner is slow:**
- Good lighting helps
- Hold steady and get barcode in focus
- Works best with standard product barcodes
