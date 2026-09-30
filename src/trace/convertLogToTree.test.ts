import { continueTrace, isEventLogEntrySpanStart, MemoryLogStorage, Trace, type LogEntry, type SpanMeta } from "@andymitchell/logging";
import { TraceViewer, type TraceResult } from "@andymitchell/logging/get-traces";
import type { TLog, TSpan } from "../types.ts";
import { convertLogToTree } from "./convertLogToTree.ts";

/**
 * Intent: the trace view draws a trace as a waterfall, so every entry recorded through logging must land under the
 * span it was recorded in, in the order it was recorded, however the entries were ordered on arrival.
 */

type Outline = string | { message: string, depth: number, children: Outline[] };

/** The tree reduced to what a reader sees: messages, indentation and nesting. */
function outline(node: TSpan | TLog): Outline {
    return node.type === 'log'
        ? node.body.message
        : { message: node.body.message, depth: node.depth, children: node.children.map(outline) };
}

function allNodes(node: TSpan | TLog): Array<TSpan | TLog> {
    return node.type === 'log' ? [node] : [node, ...node.children.flatMap(allNodes)];
}

/** A checkout whose payment span logs twice, then the checkout logs again after the span ends. */
async function recordCheckout(): Promise<TraceResult> {
    const storage = new MemoryLogStorage('');
    const checkout = new Trace(storage, 'Checkout');
    await checkout.log('Cart loaded');
    const payment = checkout.startSpan('Charge card');
    await payment.log('Contacting bank');
    await payment.error('Card declined');
    await payment.end();
    await checkout.log('Showing error');
    await checkout.end();

    const [trace] = await new TraceViewer(storage).getTraces();
    if (!trace) throw new Error('Expected the checkout trace to be stored');
    return trace;
}

const CHECKOUT_OUTLINE: Outline = {
    message: 'Checkout', depth: 0, children: [
        'Cart loaded',
        { message: 'Charge card', depth: 1, children: ['Contacting bank', 'Card declined'] },
        'Showing error',
    ],
};

describe('building the span tree for the trace view', () => {

    it('nests each log and child span under the span it was recorded in, in recorded order', async () => {
        const trace = await recordCheckout();

        const tree = convertLogToTree(trace.logs);

        expect(tree && outline(tree)).toEqual(CHECKOUT_OUTLINE);
    });

    it('builds the same tree whatever order the entries arrive in', async () => {
        const trace = await recordCheckout();
        const reversed = [...trace.logs].reverse();
        const interleaved = [...trace.logs.filter((_, i) => i % 2 === 1), ...trace.logs.filter((_, i) => i % 2 === 0)];

        const trees = [reversed, interleaved].map(entries => convertLogToTree(entries));

        for (const tree of trees) expect(tree && outline(tree)).toEqual(CHECKOUT_OUTLINE);
    });

    it('leaves the caller\'s entries in their original order', async () => {
        const trace = await recordCheckout();
        const reversed = [...trace.logs].reverse();
        const before = reversed.map(entry => entry.ulid);

        convertLogToTree(reversed);

        expect(reversed.map(entry => entry.ulid)).toEqual(before);
    });

    it('labels every span and log with the id of the trace it belongs to', async () => {
        const trace = await recordCheckout();

        const tree = convertLogToTree(trace.logs);

        const traceIds = tree ? allNodes(tree).map(node => node.body.trace_id) : [];
        expect(traceIds).toHaveLength(6);
        expect(new Set(traceIds)).toEqual(new Set([trace.id]));
    });

    it('produces no tree for a trace with no entries', () => {
        expect(convertLogToTree([])).toBeUndefined();
    });
});

/**
 * A page signs in and its trace carries on in a background that logs to a store of its own: the background attaches
 * to the page's span (by the span's id) and works in a child span. `sentFrom` picks which page spans send.
 */
async function recordAcrossStores(sentFrom: Array<'page' | 'sign in' | 'sign out'>) {
    const pageStorage = new MemoryLogStorage('');
    const backgroundStorage = new MemoryLogStorage('');
    const page = new Trace(pageStorage, 'Page');
    const senders = { 'page': page, 'sign in': page.startSpan('Sign in'), 'sign out': page.startSpan('Sign out') };
    for (const from of sentFrom) {
        // Each store orders its own entries; a later millisecond orders the two stores' entries when they are joined
        vi.setSystemTime(Date.now() + 1);
        const hop = continueTrace(backgroundStorage, senders[from].getFullId()).startSpan(`Received from ${from}`);
        await hop.log('Checking tokens');
        const request = hop.startSpan('fetch');
        await request.log('Answered');
        await request.end();
        await hop.end();
    }
    await page.end();
    const pageEntries: LogEntry<any, SpanMeta>[] = await pageStorage.get();
    const backgroundEntries: LogEntry<any, SpanMeta>[] = await backgroundStorage.get();
    return { page: pageEntries, background: backgroundEntries };
}

const ELSEWHERE = 'Recorded elsewhere';

function receivedFrom(from: string, depth: number): Outline {
    return { message: `Received from ${from}`, depth, children: ['Checking tokens', { message: 'fetch', depth: depth + 1, children: ['Answered'] }] };
}

describe('a trace that carried on in another log store', () => {
    beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
    afterEach(() => { vi.useRealTimers(); });

    it("shows the receiver's side under placeholders for the spans recorded elsewhere", async () => {
        const { background } = await recordAcrossStores(['sign in']);

        const tree = convertLogToTree(background);

        expect(tree && outline(tree)).toEqual({ message: ELSEWHERE, depth: 0, children: [
            { message: ELSEWHERE, depth: 1, children: [receivedFrom('sign in', 2)] },
        ] });
    });

    it("hangs straight under the root's placeholder when the root span itself was sent", async () => {
        const { background } = await recordAcrossStores(['page']);

        const tree = convertLogToTree(background);

        expect(tree && outline(tree)).toEqual({ message: ELSEWHERE, depth: 0, children: [receivedFrom('page', 1)] });
    });

    it('keeps every continued span in the one tree, even when their missing parents differ', async () => {
        const { background } = await recordAcrossStores(['sign in', 'sign out']);

        const tree = convertLogToTree(background);

        expect(tree && outline(tree)).toEqual({ message: ELSEWHERE, depth: 0, children: [
            { message: ELSEWHERE, depth: 1, children: [receivedFrom('sign in', 2)] },
            { message: ELSEWHERE, depth: 1, children: [receivedFrom('sign out', 2)] },
        ] });
    });

    it('keeps a log written straight on the attached span, whose start is in the other store', async () => {
        const pageStorage = new MemoryLogStorage('');
        const backgroundStorage = new MemoryLogStorage('');
        const page = new Trace(pageStorage, 'Page');
        await continueTrace(backgroundStorage, page.getFullId()).log('Logged on the attached span');
        await page.end();

        const tree = convertLogToTree(await backgroundStorage.get());

        expect(tree && outline(tree)).toEqual({ message: ELSEWHERE, depth: 0, children: ['Logged on the attached span'] });
    });

    it("shows the whole trace, with no placeholder, when both stores' entries are joined", async () => {
        const { page, background } = await recordAcrossStores(['sign in']);

        const tree = convertLogToTree([...page, ...background]);

        expect(tree && outline(tree)).toEqual({ message: 'Page', depth: 0, children: [
            { message: 'Sign in', depth: 1, children: [receivedFrom('sign in', 2)] },
            { message: 'Sign out', depth: 1, children: [] },
        ] });
    });

    it("names a span properly when its start sorts after entries recorded under it (the other store's clock ran behind)", async () => {
        const { page, background } = await recordAcrossStores(['sign in']);
        const lateStart = (entry: LogEntry<any, SpanMeta>) => isEventLogEntrySpanStart(entry) && entry.message === 'Sign in' ? { ...entry, ulid: 'Z'.repeat(26) } : entry;

        const tree = convertLogToTree([...page.map(lateStart), ...background]);

        expect(tree && outline(tree)).toEqual({ message: 'Page', depth: 0, children: [
            { message: 'Sign out', depth: 1, children: [] },
            { message: 'Sign in', depth: 1, children: [receivedFrom('sign in', 2)] },
        ] });
    });
});
