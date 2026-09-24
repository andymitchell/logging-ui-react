import { renderToString } from "react-dom/server";
import { MemoryLogStorage, Trace } from "@andymitchell/logging";
import { TraceViewer } from "@andymitchell/logging/get-traces";
import { FilterProvider, TraceFilter, TraceInspector, TraceSearchResultsList, TraceView } from "./index.ts";

/**
 * Intent: every component a consumer imports from the package entry renders with the real peers (React, the JSX
 * runtime, react-json-view-lite and its stylesheet import, logging). Server rendering runs no effects, so this
 * covers each component's first paint; trace loading is covered by the data tests.
 */

const emptyViewer = new TraceViewer(new MemoryLogStorage(''));

/** Count occurrences of an exact substring. */
function countOf(html: string, needle: string): number {
    return html.split(needle).length - 1;
}

describe('the package entry\'s components render', () => {

    describe('TraceInspector', () => {

        it('opens on the search pane, with its filter controls', () => {
            const html = renderToString(<TraceInspector tracesSource={emptyViewer} />);

            expect(html).toContain('data-container="search-pane"');
            expect(html).not.toContain('data-container="list-pane"');
            expect(html).toContain('Full Text Search');
        });

        it('with the neutral template, gives clickable rows a pointer cursor', () => {
            const html = renderToString(<TraceInspector tracesSource={emptyViewer} template="neutral" />);

            const rootClass = /^<div class="([^"]*)"/.exec(html)?.[1]?.trim();
            expect(rootClass).toBeTruthy();
            expect(html).toContain(`<style>.${rootClass} [data-container=row] { cursor: pointer; }</style>`);
        });

        it('without a template, injects no styles and keeps the caller\'s class name', () => {
            const html = renderToString(<TraceInspector tracesSource={emptyViewer} className="app-traces" />);

            expect(html).not.toContain('<style');
            expect(/^<div class="([^"]*)"/.exec(html)?.[1]?.trim()).toBe('app-traces');
        });
    });

    it('TraceView renders its container, tagged for styling', () => {
        const html = renderToString(<TraceView tracesSource={emptyViewer} traceId="any-trace" className="detail" />);

        expect(html).toContain('data-container="trace-viewer"');
        expect(html).toContain('class="detail"');
    });

    describe('TraceFilter', () => {

        it('shows one control per filter inside a FilterProvider', () => {
            const html = renderToString(<FilterProvider><TraceFilter /></FilterProvider>);

            for (const label of ['Message', 'Levels', 'Time', 'Full Text Search']) {
                expect(html).toContain(`>${label}</button>`);
            }
        });

        it('refuses to render outside a FilterProvider', () => {
            expect(() => renderToString(<TraceFilter />)).toThrow(/FilterProvider/);
        });
    });

    it('TraceSearchResultsList shows one row per entry, with its message', async () => {
        const storage = new MemoryLogStorage('');
        const trace = new Trace(storage, 'Import');
        await trace.log('Parsed 3 rows');
        await trace.warn('Skipped a blank row');
        const [result] = await new TraceViewer(storage).getTraces();
        const entries = result?.logs ?? [];

        const html = renderToString(<TraceSearchResultsList entries={entries} />);

        expect(entries).toHaveLength(3);
        expect(countOf(html, 'data-container="row"')).toBe(3);
        for (const message of ['Import', 'Parsed 3 rows', 'Skipped a blank row']) expect(html).toContain(message);
    });
});
