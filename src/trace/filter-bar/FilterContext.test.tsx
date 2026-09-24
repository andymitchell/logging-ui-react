// @vitest-environment jsdom
import { act, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryLogStorage, Trace } from "@andymitchell/logging";
import { TraceViewer } from "@andymitchell/logging/get-traces";
import { FilterProvider, TraceFilter, TraceSearch, useFilterQuery, type GetTracesFn, type TracesSource } from "../../index.ts";

/**
 * Intent: a consumer can lay out the filter controls and a search themselves, and the search follows the controls,
 * exactly as it does inside TraceInspector. Rendered in a DOM so effects and the input debounce run.
 */

declare global {
    // eslint-disable-next-line no-var -- React reads this global to know it runs under a test's act().
    var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const INPUT_DEBOUNCE_MS = 500;

/** The consumer's own search, reading its query from the enclosing FilterProvider. */
const FilteredSearch: FC<{ tracesSource: TracesSource }> = ({ tracesSource }) => {
    const query = useFilterQuery();
    return <TraceSearch tracesSource={tracesSource} query={query} />;
};

async function importTrace(): Promise<TraceViewer> {
    const storage = new MemoryLogStorage('');
    const trace = new Trace(storage, 'Import');
    await trace.log('Parsed 3 rows');
    await trace.warn('Skipped a blank row');
    return new TraceViewer(storage);
}

/** Wraps a source so the test can see how many searches ran. */
function countingSource(viewer: TraceViewer): { source: GetTracesFn, searches: () => number } {
    let searches = 0;
    const source: GetTracesFn = (filter, includeAllTraceEntries) => {
        searches++;
        return viewer.getTraces(filter, includeAllTraceEntries);
    };
    return { source, searches: () => searches };
}

function listedMessages(container: HTMLElement): string[] {
    return [...container.querySelectorAll('[data-container="row"]')].map(row => row.textContent ?? '');
}

/** Type into the text input of the filter control with this label, as a user would. */
function typeIntoControl(container: HTMLElement, label: string, text: string): void {
    const button = [...container.querySelectorAll('button')].find(b => b.textContent === label);
    const input = button?.parentElement?.querySelector('input');
    if (!input) throw new Error(`No input for the "${label}" control`);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('composing the filter controls with your own search', () => {

    let container: HTMLElement;
    let root: Root;

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
    });

    async function render(ui: React.ReactNode): Promise<void> {
        await act(async () => root.render(ui));
    }

    it('lists the entries matching whatever the user last typed into a filter control', async () => {
        const viewer = await importTrace();
        await render(
            <FilterProvider>
                <TraceFilter />
                <FilteredSearch tracesSource={viewer} />
            </FilterProvider>
        );

        async function searchMessagesFor(text: string): Promise<string[]> {
            await act(async () => typeIntoControl(container, 'Message', text));
            await act(async () => { await vi.advanceTimersByTimeAsync(INPUT_DEBOUNCE_MS); });
            return listedMessages(container);
        }
        const blank = await searchMessagesFor('blank');
        const parsed = await searchMessagesFor('Parsed');

        expect(blank).toHaveLength(1);
        expect(blank[0]).toContain('Skipped a blank row');
        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toContain('Parsed 3 rows');
    });

    it('applies the provider\'s initial filters to the first search', async () => {
        const viewer = await importTrace();

        await render(
            <FilterProvider initialComponentEntriesFilters={{ message: { message: { $regex: 'blank' } } }}>
                <FilteredSearch tracesSource={viewer} />
            </FilterProvider>
        );

        const listed = listedMessages(container);
        expect(listed).toHaveLength(1);
        expect(listed[0]).toContain('Skipped a blank row');
    });

    it('re-rendering without a filter change runs no new search', async () => {
        const { source, searches } = countingSource(await importTrace());
        const ui = (heading: string) => (
            <FilterProvider>
                <h1>{heading}</h1>
                <TraceFilter />
                <FilteredSearch tracesSource={source} />
            </FilterProvider>
        );

        await render(ui('Traces'));
        const afterMount = searches();
        await render(ui('Traces (renamed)'));

        expect(afterMount).toBe(1);
        expect(searches()).toBe(afterMount);
    });

    it('refuses to read the query outside a FilterProvider', async () => {
        const viewer = await importTrace();

        expect(() => renderToString(<FilteredSearch tracesSource={viewer} />)).toThrow(/FilterProvider/);
    });
});
