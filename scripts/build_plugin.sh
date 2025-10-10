#!/bin/bash
set -e

echo "Building Phoenix Vite plugin..."
cd priv/nb_vite
npm install
npm run build

# Copy built files to priv/static/nb_vite
echo "Copying plugin to priv/static/nb_vite..."
mkdir -p ../static/nb_vite
cp dist/index.js ../static/nb_vite/index.js
cp src/dev-server-index.html ../static/nb_vite/dev-server-index.html
cp package.json ../static/nb_vite/package.json

echo "Plugin built successfully!"
