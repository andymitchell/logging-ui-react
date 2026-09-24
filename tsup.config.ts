import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    'index': "src/index.ts",
  },
  publicDir: false,
  clean: true,
  target: ['esnext'],
  minify: false,
  splitting: false,
  dts: true,
  format: ['esm'], // When this changes, update 'type' in package.json
  // esbuild's post-resolution, post-tree-shake input graph. `build/assert-no-devdep-leak.mjs`
  // reads it to prove no devDependency reached the published bundle.
  metafile: true,
  // tsup already externalises `dependencies` and `peerDependencies`; listing the peers again makes the
  // contract explicit. Each peer must resolve to the consumer's single copy: a bundled React breaks hooks,
  // and a bundled logging breaks the `instanceof TraceViewer` check on a traces source.
  // The test runner must never be vendored either.
  external: [
    'react',
    /^react\//,
    'react-json-view-lite',
    /^react-json-view-lite\//,
    '@andymitchell/logging',
    /^@andymitchell\/logging\//,
    /^vitest(\/|$)/,
    /^@vitest\//,
    'chai',
  ],
});
