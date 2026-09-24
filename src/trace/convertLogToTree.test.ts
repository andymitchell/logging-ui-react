import { MemoryLogStorage, Trace } from "@andymitchell/logging";
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
