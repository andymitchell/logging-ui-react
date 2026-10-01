import { MemoryLogStorage, Trace } from "@andymitchell/logging";
import { TraceViewer, type ITraceViewer, type TraceFilter } from "@andymitchell/logging/get-traces";
import type { GetTracesFn } from "../types.ts";
import { getTracesFromSource } from "./getTracesFromSource.ts";
import { sourceAnswering } from "../../testing/malformedSource.ts";
import { UNREADABLE_SOURCE, viewerWithAnUnreadableSource } from "../../testing/unreadableSource.ts";

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

/**
 * A viewer that is not a `TraceViewer` from this package's copy of logging (an app's own, or one from another
 * installed copy), answering from the same storage as `viewer`.
 */
function asOtherViewer(viewer: TraceViewer): ITraceViewer {
    return { getTraces: (filter, includeAllTraceEntries) => viewer.getTraces(filter, includeAllTraceEntries) };
}

describe('loading traces from a source', () => {

    describe('a TraceViewer and an equivalent function give identical results', () => {

        it('lists every trace, in the order they started, when unfiltered', async () => {
            const viewer = new TraceViewer(await recordCheckoutThenLogin());

            const fromViewer = await getTracesFromSource(viewer);
            const fromFunction = await getTracesFromSource(asFunctionSource(viewer));

            expect(fromViewer.traces.map(trace => trace.logs[0]?.message)).toEqual(['Checkout', 'Login']);
            expect(fromFunction).toEqual(fromViewer);
        });

        it('passes a filter through, returning only traces with a matching entry', async () => {
            const viewer = new TraceViewer(await recordCheckoutThenLogin());
            const errorsOnly: TraceFilter = { entries_filter: { type: 'error' } };

            const fromViewer = await getTracesFromSource(viewer, errorsOnly);
            const fromFunction = await getTracesFromSource(asFunctionSource(viewer), errorsOnly);

            expect(fromViewer.traces.map(trace => trace.logs[0]?.message)).toEqual(['Checkout']);
            expect(fromViewer.traces[0]?.matches.map(entry => entry.message)).toEqual(['Card declined']);
            expect(fromFunction).toEqual(fromViewer);
        });

        it('passes a partial answer through: the traces that could be read, and the source that could not', async () => {
            const viewer = await viewerWithAnUnreadableSource();

            const fromViewer = await getTracesFromSource(viewer);
            const fromFunction = await getTracesFromSource(asFunctionSource(viewer));

            expect(fromViewer.ok).toBe(false);
            expect(fromViewer.traces.map(trace => trace.logs[0]?.message)).toEqual(['Checkout']);
            expect(fromViewer.error?.failures.map(failure => failure.source)).toEqual([UNREADABLE_SOURCE]);
            expect(fromFunction).toEqual(fromViewer);
        });
    });

    it('takes any ITraceViewer, not only a TraceViewer from its own copy of logging, and gives the same results', async () => {
        const viewer = new TraceViewer(await recordCheckoutThenLogin());

        const fromViewer = await getTracesFromSource(viewer);
        const fromOtherViewer = await getTracesFromSource(asOtherViewer(viewer));

        expect(fromViewer.traces.map(trace => trace.logs[0]?.message)).toEqual(['Checkout', 'Login']);
        expect(fromOtherViewer).toEqual(fromViewer);
    });

    describe('a source that answers with something other than { ok, traces }', () => {

        const malformedAnswers: Array<[string, () => Promise<unknown>]> = [
            ['a bare array of traces, as sources built for logging before 0.15 answer', async () => (await new TraceViewer(await recordCheckoutThenLogin()).getTraces()).traces],
            ['nothing', async () => undefined],
            ['a result without traces', async () => ({ ok: true })],
            ['traces that are not a list', async () => ({ ok: true, traces: 'Checkout' })],
        ];

        it.each(malformedAnswers)('is refused, with a message saying what a source must answer, when it answers %s', async (_what, answer) => {
            const source = sourceAnswering(await answer());

            await expect(getTracesFromSource(source)).rejects.toThrow('{ ok, traces }');
        });
    });

    it('returns every entry of a matching trace, not just the matching one', async () => {
        const viewer = new TraceViewer(await recordCheckoutThenLogin());

        const { traces: [checkout] } = await getTracesFromSource(viewer, { entries_filter: { type: 'error' } });

        expect(checkout?.logs.map(entry => entry.message ?? entry.type)).toEqual([
            'Checkout', 'Cart loaded', 'Charge card', 'Card declined', 'event', 'event',
        ]);
    });
});
