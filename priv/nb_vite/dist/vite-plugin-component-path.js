import * as path from 'path';
import { parse } from '@babel/parser';
import traverseDefault from '@babel/traverse';
import generateDefault from '@babel/generator';
import * as t from '@babel/types';

/**
 * Vite plugin for adding data-nb-component attribute to all React/Vue components
 *
 * This plugin transforms component files to add a data-nb-component attribute
 * to the root element, showing the source file path for easier debugging.
 *
 * Example output:
 *   <div data-nb-component="assets/js/pages/Users/Show.tsx">...</div>
 */
// Handle both ESM and CommonJS imports
const traverse = traverseDefault.default || traverseDefault;
const generate = generateDefault.default || generateDefault;
/**
 * Creates a Vite plugin that adds data-nb-component to all components
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vite';
 * import { componentPath } from '@nordbeam/nb-vite/component-path';
 *
 * export default defineConfig({
 *   plugins: [
 *     componentPath({
 *       enabled: true
 *     })
 *   ]
 * });
 * ```
 */
function componentPath(options = {}) {
    const opts = {
        enabled: true,
        includeExtension: true,
        verbose: false,
        ...options
    };
    let isDev = false;
    let projectRoot = process.cwd();
    return {
        name: 'nb-component-path',
        configResolved(config) {
            isDev = config.mode === 'development';
            if (opts.verbose) {
                console.log('[nb-vite:component-path] Plugin initialized');
                console.log(`[nb-vite:component-path] Mode: ${config.mode}`);
                if (options.enabled === true) {
                    console.log(`[nb-vite:component-path] Enabled: true (forced for all modes)`);
                }
                else if (isDev) {
                    console.log(`[nb-vite:component-path] Enabled: true (development mode)`);
                }
                else {
                    console.log(`[nb-vite:component-path] Enabled: false (production mode, use enabled: true to force)`);
                }
            }
        },
        transform(code, id) {
            // Only run if enabled AND (in dev mode OR explicitly enabled for all modes)
            // Default behavior: only dev mode
            // To enable in production: pass enabled: true explicitly
            if (!opts.enabled) {
                return null;
            }
            if (!isDev && options.enabled === undefined) {
                // Not in dev, and user didn't explicitly enable it - skip
                return null;
            }
            // Only transform React/Vue component files
            if (!isComponentFile(id)) {
                return null;
            }
            // Get relative path from project root
            const relativePath = path.relative(projectRoot, id);
            // Build the component path attribute value
            const componentPath = opts.includeExtension
                ? relativePath
                : relativePath.replace(/\.(tsx?|jsx?|vue)$/, '');
            if (opts.verbose) {
                console.log(`[nb-vite:component-path] Transforming: ${componentPath}`);
            }
            // Transform based on file type
            if (id.endsWith('.vue')) {
                return transformVueComponent(code, componentPath);
            }
            else {
                return transformReactComponent(code, componentPath, id);
            }
        }
    };
}
/**
 * Check if file is a component file that should be transformed
 */
function isComponentFile(id) {
    // Skip node_modules
    if (id.includes('node_modules')) {
        return false;
    }
    // Only process React and Vue component files
    const ext = path.extname(id);
    return ['.tsx', '.jsx', '.vue'].includes(ext);
}
/**
 * Transform React component to add data-nb-component attribute using Babel
 */
function transformReactComponent(code, componentPath, id) {
    try {
        // Parse the code into an AST
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
            sourceFilename: id
        });
        let hasModifications = false;
        const attributeValue = componentPath.replace(/\\/g, '/');
        // Traverse the AST and find JSX elements to modify
        traverse(ast, {
            // Look for default export
            ExportDefaultDeclaration(path) {
                const declaration = path.node.declaration;
                // Handle: export default function Component() { return <div>...</div> }
                if (t.isFunctionDeclaration(declaration)) {
                    transformFunctionBody(declaration, attributeValue);
                    hasModifications = true;
                }
                // Handle: export default () => <div>...</div> (inline arrow function)
                else if (t.isArrowFunctionExpression(declaration)) {
                    // Check if it directly returns JSX
                    if (t.isJSXElement(declaration.body)) {
                        addAttributeToJSXElement(declaration.body, attributeValue);
                        hasModifications = true;
                    }
                    else {
                        transformFunctionBody(declaration, attributeValue);
                        hasModifications = true;
                    }
                }
                // Handle: export default Component;
                else if (t.isIdentifier(declaration)) {
                    // Find the identifier's definition and transform it
                    const binding = path.scope.getBinding(declaration.name);
                    if (binding && binding.path.isVariableDeclarator()) {
                        const init = binding.path.node.init;
                        if (t.isFunctionExpression(init) || t.isArrowFunctionExpression(init)) {
                            transformFunctionBody(init, attributeValue);
                            hasModifications = true;
                        }
                    }
                }
            },
            // Also handle: const Component = () => {}; export default Component;
            VariableDeclarator(path) {
                const init = path.node.init;
                if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
                    // Check if this is eventually exported
                    if (t.isIdentifier(path.node.id)) {
                        const binding = path.scope.getBinding(path.node.id.name);
                        if (binding && binding.referencePaths.some((ref) => {
                            return ref.findParent((p) => p.isExportDefaultDeclaration());
                        })) {
                            transformFunctionBody(init, attributeValue);
                            hasModifications = true;
                        }
                    }
                }
            }
        });
        if (!hasModifications) {
            return null;
        }
        // Generate code from modified AST
        const output = generate(ast, {
            sourceMaps: true,
            sourceFileName: id
        }, code);
        return {
            code: output.code,
            map: output.map
        };
    }
    catch (error) {
        // If transformation fails, return original code
        console.error(`[nb-vite:component-path] Failed to transform ${id}:`, error);
        return null;
    }
}
/**
 * Transform a function body to add data-nb-component to the first JSX element
 */
function transformFunctionBody(func, componentPath) {
    // @ts-ignore - traverse signature mismatch
    traverse(func, {
        ReturnStatement(path) {
            const argument = path.node.argument;
            if (t.isJSXElement(argument)) {
                addAttributeToJSXElement(argument, componentPath);
                path.stop();
            }
            else if (t.isJSXFragment(argument)) {
                // Can't add attributes to fragments, skip
                path.stop();
            }
        },
        // Handle cases where JSX is directly returned (arrow functions)
        ArrowFunctionExpression(path) {
            if (t.isJSXElement(path.node.body)) {
                addAttributeToJSXElement(path.node.body, componentPath);
                path.stop();
            }
        }
    }, func);
}
/**
 * Add data-nb-component attribute to a JSX element
 */
function addAttributeToJSXElement(element, componentPath) {
    const openingElement = element.openingElement;
    // Check if attribute already exists
    const hasAttribute = openingElement.attributes.some(attr => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'data-nb-component');
    if (hasAttribute) {
        return;
    }
    // Create the new attribute
    const attribute = t.jsxAttribute(t.jsxIdentifier('data-nb-component'), t.stringLiteral(componentPath));
    // Add attribute to the beginning of the attributes list
    openingElement.attributes.unshift(attribute);
}
/**
 * Transform Vue component to add data-nb-component attribute
 */
function transformVueComponent(code, componentPath) {
    const attributeValue = componentPath.replace(/\\/g, '/').replace(/"/g, '&quot;');
    // Find the template section
    const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/);
    if (!templateMatch) {
        return null;
    }
    const templateContent = templateMatch[1];
    const trimmed = templateContent.trim();
    // Find the root element in the template
    const rootElementMatch = trimmed.match(/^<(\w+)([^>]*)>/);
    if (!rootElementMatch) {
        return null;
    }
    const [fullMatch, tagName, attributes] = rootElementMatch;
    // Check if data-nb-component already exists
    if (attributes.includes('data-nb-component')) {
        return null;
    }
    // Add the attribute to the root element
    const newRootElement = `<${tagName}${attributes} data-nb-component="${attributeValue}">`;
    const newTemplateContent = trimmed.replace(fullMatch, newRootElement);
    const newCode = code.replace(/<template>[\s\S]*?<\/template>/, `<template>\n${newTemplateContent}\n</template>`);
    return {
        code: newCode,
        map: null
    };
}

export { componentPath, componentPath as default };
