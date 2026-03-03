# Deploy to GitHub Pages

## Quick Setup

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `product-hunt-game`
3. Set to **Public**
4. **Don't** initialize with README (we already have code)
5. Click "Create repository"

### 2. Push Code to GitHub

Run these commands in Terminal:

```bash
cd "/Users/annelaerke/Library/CloudStorage/OneDrive-LaerdalMedicalAS/claude_code/barcode_scanner"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/product-hunt-game.git

# Push code
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in left sidebar
4. Under "Source", select **main branch**
5. Click **Save**
6. Wait 1-2 minutes for deployment

Your game will be at:
`https://YOUR_USERNAME.github.io/product-hunt-game/`

### 4. Set up Firebase Database

The game needs Firebase for multiplayer. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

**Quick version:**
1. Go to https://console.firebase.google.com/
2. Create project > Enable Realtime Database (test mode)
3. Copy config
4. Update `app.js` lines 15-23
5. Commit and push changes

### 5. Share and Play!

- Share your GitHub Pages URL with friends
- Everyone can join and compete
- Real-time leaderboard updates

## Current Mode

Right now the app runs in **localStorage mode** (single-player only).
After Firebase setup, it will automatically switch to **multiplayer mode**.

## Testing

You can test the game now without Firebase:
- It works in single-player mode
- Scores are saved locally
- To test multiplayer, set up Firebase first
