import { MemoryLogStorage, Trace } from "@andymitchell/logging";
import { TraceViewer, type TraceFilter } from "@andymitchell/logging/get-traces";
import type { GetTracesFn } from "../types.ts";
import { getTracesFromSource } from "./getTracesFromSource.ts";

/**
 * Intent: every component accepts either a `TraceViewer` or a plain function as its traces source, and must show
 * the same traces for both. These tests run the real logging pipeline (storage → trace → viewer), no mocks.
 */

/** Two traces: a checkout whose payment span fails, then a login. */
async function recordCheckoutThenLogin(): Promise<MemoryLogStorage> {
    const storage = new MemoryLogStorage('');

    const checkout = new Trace(storage, 'Checkout');
    await checkout.log('Cart loaded');
    const payment = checkout.startSpan('Charge card');
    await payment.error('Card declined');
    await payment.end();
    await checkout.end();

    const login = new Trace(storage, 'Login');
    await login.log('Password accepted');
    await login.end();

    return storage;
}

/** A function source that answers from the same storage as the viewer. */
function asFunctionSource(viewer: TraceViewer): GetTracesFn {
    return (filter, includeAllTraceEntries) => viewer.getTraces(filter, includeAllTraceEntries);
}

describe('loading traces from a source', () => {

    describe('a TraceViewer and an equivalent function give identical results', () => {

        it('lists every trace, in the order they started, when unfiltered', async () => {
            const viewer = new TraceViewer(await recordCheckoutThenLogin());

            const fromViewer = await getTracesFromSource(viewer);
            const fromFunction = await getTracesFromSource(asFunctionSource(viewer));

            expect(fromViewer.map(trace => trace.logs[0]?.message)).toEqual(['Checkout', 'Login']);
            expect(fromFunction).toEqual(fromViewer);
        });

        it('passes a filter through, returning only traces with a matching entry', async () => {
            const viewer = new TraceViewer(await recordCheckoutThenLogin());
            const errorsOnly: TraceFilter = { entries_filter: { type: 'error' } };

            const fromViewer = await getTracesFromSource(viewer, errorsOnly);
            const fromFunction = await getTracesFromSource(asFunctionSource(viewer), errorsOnly);

            expect(fromViewer.map(trace => trace.logs[0]?.message)).toEqual(['Checkout']);
            expect(fromViewer[0]?.matches.map(entry => entry.message)).toEqual(['Card declined']);
            expect(fromFunction).toEqual(fromViewer);
        });
    });

    it('returns every entry of a matching trace, not just the matching one', async () => {
        const viewer = new TraceViewer(await recordCheckoutThenLogin());

        const [checkout] = await getTracesFromSource(viewer, { entries_filter: { type: 'error' } });

        expect(checkout?.logs.map(entry => entry.message ?? entry.type)).toEqual([
            'Checkout', 'Cart loaded', 'Charge card', 'Card declined', 'event', 'event',
        ]);
    });
});
