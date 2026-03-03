# 🎯 Product Hunt - Multiplayer Barcode Game

Race against friends to scan 3 different products first! A real-time multiplayer game using your phone's camera.

## 🎮 How to Play

1. **Join the game** - Enter your name
2. **Start scanning** - Use your phone camera to scan product barcodes
3. **Collect 3 products** - Each barcode must be unique
4. **First to 3 wins!** - Watch the live leaderboard

## 🚀 Quick Start

### 1. Set up Firebase (Required for Multiplayer)

See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for detailed instructions.

**Quick version:**
- Go to https://console.firebase.google.com/
- Create project > Enable Realtime Database (test mode)
- Copy config to `app.js`

### 2. Deploy to Netlify

1. Go to https://app.netlify.com/drop
2. Drag the `barcode_scanner` folder
3. Share the URL with friends!

### 3. Play!

- Open the URL on iPhones
- Everyone enters their name
- Start scanning products
- First to 3 wins

## ✨ Features

- **Real-time multiplayer** - See everyone's progress live
- **Works on iPhone** - Uses Safari camera API
- **No app install** - Just a web URL
- **Product recognition** - Shows product names and images
- **Live leaderboard** - Know who's winning

## 📱 Supported Barcodes

- EAN-13, EAN-8 (European products)
- UPC-A, UPC-E (US products)
- Code 128, Code 39
- QR codes

## 🔧 Troubleshooting

**Camera won't start:**
- Make sure you're using HTTPS (Netlify provides this)
- Safari Settings > Camera = "Ask"
- Allow camera access when prompted

**Players not syncing:**
- Check Firebase is set up correctly
- Make sure all players use the same URL
- Check browser console for errors

**Product not found:**
- Not all barcodes are in public databases
- Try common grocery items (Coca-Cola, cereals, etc.)

## 🎯 Game Tips

- **Scan unique products** - Duplicates don't count
- **Scan quickly** - Others are racing too
- **Use good lighting** - Helps camera focus
- **Steady hands** - Keep barcode centered

## 🛠 Tech Stack

- HTML5 QR Code library for scanning
- Firebase Realtime Database for multiplayer
- Open Food Facts API for product data
- Netlify for hosting

## 📝 Future Ideas

- Different game modes (time limits, team play)
- Achievements and badges
- Product categories challenges
- Leaderboard history
