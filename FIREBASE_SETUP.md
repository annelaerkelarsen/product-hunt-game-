# Firebase Setup Instructions

The game uses Firebase Realtime Database for multiplayer functionality. Here's how to set it up:

## Quick Setup (5 minutes)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with Google account

2. **Create New Project**
   - Click "Add project"
   - Name: "product-hunt-game" (or anything you want)
   - Disable Google Analytics (not needed)
   - Click "Create project"

3. **Set up Realtime Database**
   - In left sidebar, click "Build" > "Realtime Database"
   - Click "Create Database"
   - Choose location (closest to you)
   - Start in **"Test mode"** (allows public read/write for 30 days)
   - Click "Enable"

4. **Get Configuration**
   - In left sidebar, click the gear icon > "Project settings"
   - Scroll down to "Your apps"
   - Click the web icon `</>`
   - Register app name: "Product Hunt"
   - Copy the `firebaseConfig` object

5. **Update app.js**
   - Open `app.js`
   - Replace the `firebaseConfig` object (lines 5-13) with your config
   - Save the file

6. **Deploy to Netlify**
   - Drag the updated folder to Netlify Drop
   - Share the URL with friends to play!

## Security Note

Test mode allows anyone to read/write data. For production:
- Go to Realtime Database > Rules
- Update rules to require authentication or add data validation

## Done!

Once configured, the game will:
- Show all players in real-time
- Update scores instantly
- Detect winners automatically
- Work from anywhere with the Netlify URL
