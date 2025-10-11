#!/bin/bash
set -e

echo "Building Phoenix Vite plugin..."

# Run npm install at root
npm install

# Build the plugin
npm run build

# Copy built files to priv/static/nb_vite
echo "Copying plugin to priv/static/nb_vite..."
mkdir -p priv/static/nb_vite
cp priv/nb_vite/dist/index.js priv/static/nb_vite/index.js
cp priv/nb_vite/src/dev-server-index.html priv/static/nb_vite/dev-server-index.html
cp priv/static/nb_vite/package.json priv/static/nb_vite/package.json.bak
cat > priv/static/nb_vite/package.json << 'EOF'
{
  "name": "nb_vite",
  "version": "0.1.0",
  "description": "Vite plugin for Phoenix Framework",
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts"
}
EOF

echo "Plugin built successfully!"
