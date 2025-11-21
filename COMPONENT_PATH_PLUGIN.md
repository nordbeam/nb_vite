# Component Path Plugin

A Vite plugin that automatically adds `data-nb-component` attributes to all React and Vue components, showing the source file path for easier debugging.

## Features

- 🔍 **Automatic Attribution**: Adds `data-nb-component` attribute to all component root elements
- 🎯 **Development-Only**: Only runs in development mode (configurable)
- ⚛️ **React Support**: Uses Babel AST transformation for React/JSX/TSX components
- 🖖 **Vue Support**: Template-based transformation for Vue 3 SFC files
- 🚀 **Zero Config**: Works out of the box with sensible defaults
- 📝 **Full Path Support**: Shows complete file path from project root

## Installation

The plugin is included in `@nordbeam/nb-vite`:

```bash
npm install --save-dev @nordbeam/nb-vite
```

## Usage

### Basic Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import phoenix from '@nordbeam/nb-vite';
import { componentPath } from '@nordbeam/nb-vite/component-path';

export default defineConfig({
  plugins: [
    phoenix(),
    componentPath()
  ]
});
```

### Importing from Main Package

You can also import from the main package:

```typescript
import phoenix, { componentPath } from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    phoenix(),
    componentPath()
  ]
});
```

## Configuration

```typescript
componentPath({
  // Enable/disable the plugin (default: true in dev, false in prod)
  enabled: true,

  // Root directory for paths (default: 'assets')
  root: 'assets',

  // Include file extensions (default: true)
  includeExtension: true,

  // Verbose logging (default: false)
  verbose: false
})
```

## How It Works

### React Components

The plugin uses Babel to parse and transform React components at build time:

**Before:**
```tsx
// assets/js/pages/Users/Show.tsx
export default function UserShow({ user }) {
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
    </div>
  );
}
```

**After (in browser):**
```html
<div data-nb-component="assets/js/pages/Users/Show.tsx" class="user-profile">
  <h1>John Doe</h1>
</div>
```

### Vue Components

For Vue 3 SFC files, the plugin transforms the template:

**Before:**
```vue
<!-- assets/js/pages/Users/Show.vue -->
<template>
  <div class="user-profile">
    <h1>{{ user.name }}</h1>
  </div>
</template>
```

**After (in browser):**
```html
<div data-nb-component="assets/js/pages/Users/Show.vue" class="user-profile">
  <h1>John Doe</h1>
</div>
```

## Use Cases

### 1. Debugging in DevTools

Quickly identify which component rendered a specific DOM element:

```javascript
// In browser DevTools console
$0.dataset.nbComponent
// => "assets/js/pages/Users/Show.tsx"
```

### 2. Visual Regression Testing

Track which components changed between builds:

```javascript
// Find all components on the page
document.querySelectorAll('[data-nb-component]')
  .forEach(el => console.log(el.dataset.nbComponent));
```

### 3. Performance Monitoring

Track render performance by component:

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const element = document.querySelector(`[data-nb-component]`);
    if (element) {
      console.log(`${element.dataset.nbComponent}: ${entry.duration}ms`);
    }
  }
});
observer.observe({ entryTypes: ['measure'] });
```

### 4. Component Documentation

Generate component inventory from your running application:

```javascript
// Get all unique components on the page
const components = [...new Set(
  [...document.querySelectorAll('[data-nb-component]')]
    .map(el => el.dataset.nbComponent)
)];
console.log('Components:', components);
```

## Browser Support

The plugin generates standard HTML5 data attributes that work in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Integration with nb_inertia

When used with `nb_inertia`, you can identify both the Inertia page component and all child components:

```html
<div id="app">
  <div data-nb-component="assets/js/pages/Users/Index.tsx">
    <header data-nb-component="assets/js/components/Header.tsx">
      <!-- Header content -->
    </header>
    <main>
      <div data-nb-component="assets/js/components/UserList.tsx">
        <!-- User list -->
      </div>
    </main>
  </div>
</div>
```

## Performance Considerations

- **Development**: Minimal overhead (Babel transformation during HMR)
- **Production**: Disabled by default to reduce bundle size
- **Build Time**: Adds ~50-100ms to build time for average projects
- **Runtime**: Zero performance impact (attributes are static)

## Supported File Types

- `.tsx` - React with TypeScript
- `.jsx` - React with JavaScript
- `.vue` - Vue 3 Single File Components

## Limitations

1. **React Fragments**: Cannot add attributes to React fragments (`<></>`)
2. **Dynamic Roots**: Components with conditional root elements will only annotate the first return statement
3. **HOCs**: Higher-order components will show the wrapper component path
4. **Node Modules**: Files in `node_modules` are automatically excluded

## Advanced Configuration

### Custom Path Resolution

```typescript
componentPath({
  root: 'src',
  includeExtension: false
})

// Result: "pages/Users/Show" instead of "assets/js/pages/Users/Show.tsx"
```

### Enable in Production

```typescript
componentPath({
  enabled: process.env.NODE_ENV === 'production'
})
```

**Warning**: This will increase your production bundle size and expose file paths. Only enable if you have a specific need.

## Troubleshooting

### Attributes Not Appearing

1. Check that the plugin is running:
   ```typescript
   componentPath({ verbose: true })
   ```

2. Verify it's in development mode:
   ```bash
   npm run dev  # or your dev command
   ```

3. Check browser DevTools for the attributes:
   ```javascript
   document.querySelector('[data-nb-component]')
   ```

### Build Errors

If you encounter Babel-related errors:

1. Ensure you have the required dependencies:
   ```bash
   npm install --save-dev @nordbeam/nb-vite
   ```

2. Check that your `vite.config.ts` is valid TypeScript

3. Try disabling the plugin temporarily:
   ```typescript
   componentPath({ enabled: false })
   ```

## Examples

### Full Phoenix + Inertia + React Setup

```typescript
// assets/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import phoenix from '@nordbeam/nb-vite';
import { nbRoutes, componentPath } from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    react(),
    phoenix({ input: ['js/app.ts'] }),
    nbRoutes({ enabled: true }),
    componentPath({ verbose: true })
  ],
  resolve: {
    alias: {
      '@': '/js'
    }
  }
});
```

### Vue 3 Setup

```typescript
// assets/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import phoenix from '@nordbeam/nb-vite';
import { componentPath } from '@nordbeam/nb-vite';

export default defineConfig({
  plugins: [
    vue(),
    phoenix({ input: ['js/app.ts'] }),
    componentPath()
  ]
});
```

## Related

- [nb_vite](../README.md) - Main Vite plugin for Phoenix
- [nb_routes](../../nb_routes/README.md) - Type-safe route helpers
- [nb_inertia](../../nb_inertia/README.md) - Inertia.js integration

## License

MIT
