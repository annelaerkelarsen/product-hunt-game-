#!/bin/bash

# Deploy to GitHub Pages
# Usage: ./deploy.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh YOUR_GITHUB_USERNAME"
    echo "Example: ./deploy.sh annelaerke"
    exit 1
fi

USERNAME=$1

cd "/Users/annelaerke/Library/CloudStorage/OneDrive-LaerdalMedicalAS/claude_code/barcode_scanner"

# Add remote if not exists
git remote add origin https://github.com/$USERNAME/product-hunt-game.git 2>/dev/null || true

# Push to GitHub
git branch -M main
git push -u origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo "📝 Next steps:"
echo "1. Go to https://github.com/$USERNAME/product-hunt-game/settings/pages"
echo "2. Under 'Source', select 'main branch'"
echo "3. Click 'Save'"
echo "4. Your game will be live at: https://$USERNAME.github.io/product-hunt-game/"
echo ""
echo "🔥 To enable multiplayer:"
echo "See FIREBASE_SETUP.md for Firebase configuration"
