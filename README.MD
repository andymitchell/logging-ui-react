# @andymitchell/logging-ui-react

React components for browsing traces recorded with [`@andymitchell/logging`](https://github.com/andymitchell/logging): search and list traces, then open one as a collapsible span tree with each entry viewable as JSON.

## Install

This package and its peers are on GitHub Packages; see [BUILD.MD](./BUILD.MD#4-consuming-this-package-in-another-project) for the one-off `.npmrc` setup.

```bash
npm install @andymitchell/logging-ui-react @andymitchell/logging react react-json-view-lite
```

All three peers are required:

| Peer | Range |
|---|---|
| `@andymitchell/logging` | `>=0.14.0 <1.0.0` |
| `react` | `^18.3.1 \|\| ^19.0.0` |
| `react-json-view-lite` | `^2.4.1` |

## Usage

```tsx
import { IDBLogStorage } from '@andymitchell/logging';
import { TraceViewer } from '@andymitchell/logging/get-traces';
import { TraceInspector } from '@andymitchell/logging-ui-react';

const viewer = new TraceViewer(new IDBLogStorage('my-app'));

export const Traces = () => <TraceInspector tracesSource={viewer} template="neutral" />;
```

`tracesSource` is either a `TraceViewer` or a function with the same signature as `TraceViewer.getTraces` (`GetTracesFn`), e.g. one that fetches traces from a server. Like `getTraces`, the function resolves `{ ok, traces, error? }`:

```ts
const fromServer: GetTracesFn = async (filter) =>
    (await fetch('/traces', { method: 'POST', body: JSON.stringify(filter) })).json();   // the server sends what its viewer.getTraces(filter) resolved
```

Exports: `TraceInspector` (search + list + detail, all in one), `TraceView` (one trace as a span tree), `TraceSearch` / `TraceSearchResultsList` (run a search / render matching entries), `TraceFilter` + `FilterProvider` + `useFilterQuery` (the filter controls and the query they build), and the types `TracesSource`, `GetTracesFn`, `BaseComponentTypes`.

### Your own layout

To place the filter controls and the results yourself, wrap both in a `FilterProvider` and feed the controls' query to `TraceSearch` with `useFilterQuery`. The search re-runs whenever a control changes:

```tsx
import { useState } from 'react';
import { FilterProvider, TraceFilter, TraceSearch, useFilterQuery, TraceView } from '@andymitchell/logging-ui-react';

const Results = ({ onOpen }: { onOpen: (traceId: string) => void }) => (
    <TraceSearch tracesSource={viewer} query={useFilterQuery()} onClick={onOpen} />
);

export const Traces = () => {
    const [traceId, setTraceId] = useState<string>();
    return (
        <FilterProvider>
            <header><TraceFilter /></header>
            <aside><Results onOpen={setTraceId} /></aside>
            <main>{traceId && <TraceView tracesSource={viewer} traceId={traceId} />}</main>
        </FilterProvider>
    );
};
```

`useFilterQuery` must be called from a component inside the `FilterProvider` (here `Results`), not from the one rendering it. The search lists nothing until a control has a value.

### When a source fails

The components keep working when logging is failing, which is when you most need them.

- **Some log sources can't be read** (e.g. a `ChannelsLogStorage` whose IndexedDB child is broken): the components show the traces the other sources returned, plus a notice naming the sources that failed (`data-container="source-failures"`).
- **A function source throws or rejects** (e.g. the server is unreachable): the components show `Error: <message>` (`data-container="load-error"`) and keep what they last loaded.

## Upgrading to 0.3.0

- **Requires `@andymitchell/logging` 0.14.0 or later.** From 0.14.0, `getTraces` resolves `{ ok, traces, error? }` instead of an array. Earlier versions of this package accept 0.14.0 as a peer, but fail at runtime against it. Upgrade both packages together.
- **A `GetTracesFn` must resolve `{ ok, traces, error? }`**, the same as `TraceViewer.getTraces`. A function that passes a viewer's answer through needs no change. One that builds an array itself returns `{ ok: true, traces }`.

## Requirements

- **A bundler that handles CSS imports.** `TraceView` imports `react-json-view-lite/dist/index.css`. Vite, webpack, Next.js, Parcel and esbuild (with a CSS loader) all do.
- **One copy of `@andymitchell/logging`.** The components recognise a `TraceViewer` with `instanceof`, so it must come from the same copy this package resolves. Keeping logging a peer ensures this; check with `npm ls @andymitchell/logging`.
- **`ref` needs React 19.** Components take `ref` as a plain prop. React 18 strips `ref` from function component props, so it's ignored there.

## Styling

Components render unstyled apart from layout. `template="neutral"` on `TraceInspector` adds a pointer cursor to clickable rows. Every component takes `className` and `style` for its root element, and inner elements carry a `data-container` attribute (`row`, `span`, `log`, `trace-viewer`, `source-failures`, `load-error`, ...) for CSS to target.

## Development

```bash
npm test                 # vitest
npm run typecheck
npm run build_prepare    # build + devDependency-leak guard + publint
```

`testing/live` is a Vite harness for the components in a browser (see its README). Publishing: [BUILD.MD](./BUILD.MD).
