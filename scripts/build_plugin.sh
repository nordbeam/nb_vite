#!/usr/bin/env bash
set -euo pipefail

echo "Building Phoenix Vite plugin with Vite+..."

if command -v vp >/dev/null 2>&1; then
  task_vp_bin=("vp")
elif [[ -x "node_modules/.bin/vp" ]]; then
  task_vp_bin=("node_modules/.bin/vp")
else
  echo "No global or project-local vp found; bootstrapping Vite+ 0.3.0 with npm 12.0.2."
  task_vp_bin=("corepack" "npm@12.0.2" "exec" "--yes" "--package=vite-plus@0.3.0" "--" "vp")
fi

# Vite+ installs with the repository's pinned npm 12.0.2 package-manager policy
# and uses the local vite-plus package for the pack configuration.
"${task_vp_bin[@]}" install --frozen-lockfile
"${task_vp_bin[@]}" run build

# Keep the legacy file-reference distribution in sync for applications that
# have not migrated to the GitHub package yet.
echo "Copying plugin artifacts to priv/static/nb_vite..."
mkdir -p priv/static/nb_vite
for artifact in priv/nb_vite/dist/*; do
  cp "$artifact" priv/static/nb_vite/
done

echo "Plugin built successfully!"
