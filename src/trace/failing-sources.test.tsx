// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TraceInspector, TraceSearch, TraceView, type GetTracesFn } from "../index.ts";
import { UNREADABLE_SOURCE, viewerWithAnUnreadableSource } from "../testing/unreadableSource.ts";

/**
 * Intent: a trace browser is most needed while logging is failing, so a failing source must never blank the UI or
 * break the page. Each component shows whatever could be read and says which log sources could not.
 * Rendered in a DOM so effects run.
 */

declare global {
    // eslint-disable-next-line no-var -- React reads this global to know it runs under a test's act().
    var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Lets every pending load settle: microtasks drain before each macrotask runs. */
async function settle(): Promise<void> {
    for (let turn = 0; turn < 2; turn++) await new Promise<void>(resolve => setImmediate(resolve));
}

/** Records every promise rejection that nothing handled, until the test finishes. */
function recordUnhandledRejections(): unknown[] {
    const reasons: unknown[] = [];
    const record = (reason: unknown) => { reasons.push(reason); };
    process.on('unhandledRejection', record);
    onTestFinished(() => { process.off('unhandledRejection', record); });
    return reasons;
}

function textOf(container: HTMLElement, dataContainer: string): string[] {
    return [...container.querySelectorAll(`[data-container="${dataContainer}"]`)].map(element => element.textContent ?? '');
}

describe('components loading from a source that fails', () => {

    let container: HTMLElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    async function render(ui: React.ReactNode): Promise<void> {
        await act(async () => {
            root.render(ui);
            await settle();
        });
    }

    /** Switch a rendered TraceInspector to its "List" pane, as a user would from its nav. */
    async function openListPane(): Promise<void> {
        const listTab = [...container.querySelectorAll('nav > div')].find(tab => tab.textContent === 'List');
        if (!listTab) throw new Error('No "List" tab in the inspector\'s nav');
        await act(async () => {
            listTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await settle();
        });
    }

    describe('when some log sources cannot be read, shows what the others returned and names the ones that failed', () => {

        it('a search', async () => {
            const viewer = await viewerWithAnUnreadableSource();

            await render(<TraceSearch tracesSource={viewer} query={{ entries_filter: { type: 'error' } }} />);

            expect(textOf(container, 'row')).toEqual([expect.stringContaining('Card declined')]);
            expect(textOf(container, 'source-failures')).toEqual([expect.stringContaining(UNREADABLE_SOURCE)]);
        });

        it('a single trace', async () => {
            const viewer = await viewerWithAnUnreadableSource();
            const { traces: [checkout] } = await viewer.getTraces();

            await render(<TraceView tracesSource={viewer} traceId={checkout?.id ?? 'missing'} />);

            expect(textOf(container, 'log')).toEqual([expect.stringContaining('Card declined')]);
            expect(textOf(container, 'source-failures')).toEqual([expect.stringContaining(UNREADABLE_SOURCE)]);
        });

        it('the inspector\'s list of traces', async () => {
            const viewer = await viewerWithAnUnreadableSource();
            await render(<TraceInspector tracesSource={viewer} />);

            await openListPane();

            expect(textOf(container, 'row')).toEqual([expect.stringContaining('Checkout')]);
            expect(textOf(container, 'source-failures')).toEqual([expect.stringContaining(UNREADABLE_SOURCE)]);
        });
    });

    describe('when a function source throws or rejects, shows its message and leaves nothing unhandled', () => {

        const failingSources: Array<[string, GetTracesFn]> = [
            ['throws', () => { throw new Error('Trace server unreachable'); }],
            ['rejects', () => Promise.reject(new Error('Trace server unreachable'))],
        ];

        describe.each(failingSources)('a source that %s', (_how, source) => {

            it('a search', async () => {
                const unhandled = recordUnhandledRejections();

                await render(<TraceSearch tracesSource={source} query={{ entries_filter: { type: 'error' } }} />);

                expect(textOf(container, 'load-error')).toEqual(['Error: Trace server unreachable']);
                expect(unhandled).toEqual([]);
            });

            it('a single trace', async () => {
                const unhandled = recordUnhandledRejections();

                await render(<TraceView tracesSource={source} traceId="any-trace" />);

                expect(textOf(container, 'load-error')).toEqual(['Error: Trace server unreachable']);
                expect(unhandled).toEqual([]);
            });

            it('the inspector\'s list of traces', async () => {
                const unhandled = recordUnhandledRejections();
                await render(<TraceInspector tracesSource={source} />);

                await openListPane();

                expect(textOf(container, 'load-error')).toEqual(['Error: Trace server unreachable']);
                expect(unhandled).toEqual([]);
            });
        });
    });
});
