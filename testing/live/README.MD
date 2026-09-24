# Live harness

Renders the components from `../../src` in a browser, against the repo root's installed `@andymitchell/logging`.

```bash
npm install          # at the repo root first, then here
npm run dev          # open the printed URL; index.html links every page
```

# Troubleshooting

## Using old/cached npm module

It might be cached. Make Vite do-over with `npm run clean-dev`
