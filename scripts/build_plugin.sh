#!/usr/bin/env bash
set -euo pipefail

echo "Building Phoenix Vite plugin with Vite+..."

if command -v vp >/dev/null 2>&1; then
  task_vp_bin="vp"
elif [[ -x "node_modules/.bin/vp" ]]; then
  task_vp_bin="node_modules/.bin/vp"
else
  echo "Vite+ is required to build nb_vite. Run npm install or install it globally with:"
  echo "  curl -fsSL https://vite.plus | bash"
  exit 1
fi

# Vite+ delegates dependency installation to the package manager recorded by
# the lockfile and uses the local vite-plus package for the pack configuration.
"$task_vp_bin" install --frozen-lockfile
"$task_vp_bin" run build

# Keep the legacy file-reference distribution in sync for applications that
# have not migrated to the GitHub package yet.
echo "Copying plugin artifacts to priv/static/nb_vite..."
mkdir -p priv/static/nb_vite
for artifact in priv/nb_vite/dist/*; do
  cp "$artifact" priv/static/nb_vite/
done

echo "Plugin built successfully!"
