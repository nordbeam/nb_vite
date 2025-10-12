# Docker and Release Deployment Guide

This guide covers deploying Phoenix applications using NbVite with Docker and Elixir releases.

## Table of Contents

- [Configuration for Releases](#configuration-for-releases)
- [Docker Setup](#docker-setup)
- [Multi-Stage Dockerfile Example](#multi-stage-dockerfile-example)
- [Docker Compose Example](#docker-compose-example)
- [Troubleshooting](#troubleshooting)

## Configuration for Releases

When building releases, NbVite needs to know your OTP app name to correctly locate assets. Add this to your `config/config.exs`:

```elixir
config :nb_vite,
  otp_app: :my_app  # Replace with your app name
```

The installer automatically adds this configuration, but if you're upgrading or setting up manually, ensure it's present.

### How It Works

In development, NbVite uses `File.cwd!()` to locate the `priv/` directory. In releases, the current working directory may differ from your application's location, so NbVite uses `:code.priv_dir(:my_app)` instead when the `:otp_app` is configured.

## Docker Setup

### Multi-Stage Dockerfile Example

Here's a complete Dockerfile for a Phoenix application with NbVite:

```dockerfile
# Find eligible builder and runner images on Docker Hub. We use Ubuntu/Debian
# instead of Alpine to avoid DNS resolution issues in production.
ARG ELIXIR_VERSION=1.17.3
ARG OTP_VERSION=27.1
ARG DEBIAN_VERSION=bookworm-20241016

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}-slim"

################################################################################
# Stage 1: Build dependencies
FROM ${BUILDER_IMAGE} AS builder

# Install build dependencies
RUN apt-get update -y && \
    apt-get install -y build-essential git curl && \
    apt-get clean && \
    rm -f /var/lib/apt/lists/*_*

# Install Node.js (required for Vite)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -f /var/lib/apt/lists/*_*

# Prepare build directory
WORKDIR /app

# Install Hex and Rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build ENV
ENV MIX_ENV="prod"

# Install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# Copy compile-time config files before we compile dependencies
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

################################################################################
# Stage 2: Build assets
FROM builder AS assets

# Copy the entire application
COPY priv priv
COPY lib lib
COPY assets assets

# Change to assets directory and install Node dependencies
WORKDIR /app/assets

# Install JavaScript dependencies
# Use npm ci for faster, more reliable installs in CI/Docker
RUN npm ci --prefer-offline --no-audit --progress=false --loglevel=error

# Build assets
# The assets.deploy task runs: nb_vite.deps, nb_vite build, phx.digest
WORKDIR /app
RUN mix assets.deploy

################################################################################
# Stage 3: Build release
FROM builder AS releaser

# Copy built assets from previous stage
COPY --from=assets /app/priv/static ./priv/static

# Copy the rest of the application
COPY lib lib
COPY priv priv
COPY config config

# Compile the release
RUN mix compile

# Changes to config/runtime.exs don't require recompiling the code
COPY config/runtime.exs config/

COPY rel rel
RUN mix release

################################################################################
# Stage 4: Create runtime image
FROM ${RUNNER_IMAGE}

# Install runtime dependencies
RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates && \
    apt-get clean && \
    rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app
RUN chown nobody /app

# Set runner ENV
ENV MIX_ENV="prod"

# Copy the release from the previous stage
COPY --from=releaser --chown=nobody:root /app/_build/${MIX_ENV}/rel/my_app ./

USER nobody

# Start the Phoenix app
CMD ["/app/bin/server"]
```

### Important Docker Considerations

1. **Node.js Installation**: Vite requires Node.js to build assets. Install it in the builder stage.

2. **Asset Build Order**:
   - Install Elixir dependencies first (`mix deps.get`)
   - Copy application code
   - Install Node dependencies (`npm ci`)
   - Build assets (`mix assets.deploy`)
   - Build release

3. **npm ci vs npm install**: Use `npm ci` in Docker for:
   - Faster installs
   - More reliable builds
   - Proper lockfile handling

4. **Multi-Stage Builds**: Keep Node.js and build tools out of the final runtime image to minimize size.

### Alternative: Using Bun

If you're using Bun as your JavaScript runtime:

```dockerfile
# Install Bun instead of Node.js
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="${PATH}:/root/.bun/bin"

# In assets directory
WORKDIR /app/assets
RUN bun install --frozen-lockfile
```

## Docker Compose Example

For development with Docker Compose:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      PHX_HOST: localhost:4000
      DATABASE_URL: postgres://postgres:postgres@db/my_app_dev
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
    ports:
      - "4000:4000"
    depends_on:
      - db
    volumes:
      # Mount for development hot-reload (optional)
      - ./lib:/app/lib
      - ./priv:/app/priv

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: my_app_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Troubleshooting

### Issue: "Vite manifest not found" in production

**Cause**: Assets weren't built or the manifest path is incorrect.

**Solution**:
1. Ensure `mix assets.deploy` runs in your Docker build
2. Verify the `:otp_app` is configured in `config/config.exs`
3. Check that `priv/static/assets/manifest.json` exists in your release

### Issue: "failed to load config from /app/assets/vite.config.js - undefined"

**Cause**: Missing Node dependencies or Vite not installed.

**Solution**:
1. Ensure Node.js is installed in the builder stage
2. Run `npm ci` before building assets
3. Verify `vite` is in your `package.json` dependencies
4. Check the build logs for npm install errors

### Issue: Assets not updating after rebuild

**Cause**: Docker layer caching.

**Solution**:
```bash
# Rebuild without cache
docker build --no-cache -t my_app .

# Or clear the assets stage cache
docker build --build-arg CACHEBUST=$(date +%s) -t my_app .
```

### Issue: Workspace setup with npm/pnpm/yarn

**Cause**: Some package managers have issues with Phoenix's `../deps` structure.

**Solution**: Consider using Bun which handles workspaces better, or use the automatic aliasing that NbVite provides (no workspace configuration needed).

### Issue: Permission errors in Docker

**Cause**: Files created during build have wrong ownership.

**Solution**: Use `--chown` when copying files:
```dockerfile
COPY --from=assets --chown=nobody:root /app/priv/static ./priv/static
```

## Platform-Specific Guides

### Fly.io

```dockerfile
# Use Fly's base images
FROM flyio/elixir:1.17.3 AS builder

# ... rest of build stages ...

# Runtime config
ENV ECTO_IPV6="true"
ENV ERL_AFLAGS="-proto_dist inet6_tcp"
```

### Railway

Railway automatically detects Elixir apps. Use the Dockerfile above and set these environment variables in Railway dashboard:
- `SECRET_KEY_BASE`
- `DATABASE_URL` (automatically provided)

### Render

Create a `render.yaml`:
```yaml
services:
  - type: web
    name: my-app
    env: elixir
    buildCommand: mix deps.get && mix assets.deploy && mix release
    startCommand: _build/prod/rel/my_app/bin/server
    envVars:
      - key: MIX_ENV
        value: prod
      - key: SECRET_KEY_BASE
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: my-app-db
          property: connectionString

databases:
  - name: my-app-db
    databaseName: my_app
    plan: starter
```

## Best Practices

1. **Configuration**: Always set `:otp_app` in your config
2. **Build Order**: Install dependencies before copying code
3. **Layer Caching**: Order Dockerfile commands from least to most frequently changed
4. **Security**: Run as non-root user (`nobody`) in production
5. **Logging**: Use JSON logging in production for better log aggregation
6. **Health Checks**: Implement health check endpoints for orchestration

## Additional Resources

- [Phoenix Deployment Guides](https://hexdocs.pm/phoenix/deployment.html)
- [Elixir Release Documentation](https://hexdocs.pm/mix/Mix.Tasks.Release.html)
- [Vite Production Build](https://vitejs.dev/guide/build.html)
