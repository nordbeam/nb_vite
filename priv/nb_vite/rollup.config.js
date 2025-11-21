import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
  // Main plugin
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
      inlineDynamicImports: true,
    },
    external: [
      "vite",
      "vite-node/server",
      "vite-node/client",
      "vite-node/source-map",
      "node:fs",
      "node:path",
      "node:net",
      "node:http",
      "fs",
      "path",
      "net",
      "http",
      "child_process",
      "@babel/parser",
      "@babel/traverse",
      "@babel/generator",
      "@babel/types"
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
  },
  // nb-routes plugin
  {
    input: "src/vite-plugin-nb-routes.ts",
    output: {
      file: "dist/vite-plugin-nb-routes.js",
      format: "esm",
      inlineDynamicImports: true,
    },
    external: [
      "vite",
      "node:fs",
      "node:path",
      "node:child_process",
      "fs",
      "path",
      "child_process"
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
  },
  // component-path plugin
  {
    input: "src/vite-plugin-component-path.ts",
    output: {
      file: "dist/vite-plugin-component-path.js",
      format: "esm",
      inlineDynamicImports: true,
    },
    external: [
      "vite",
      "node:fs",
      "node:path",
      "fs",
      "path",
      "@babel/parser",
      "@babel/traverse",
      "@babel/generator",
      "@babel/types"
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false,
      }),
      json(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
  }
];
