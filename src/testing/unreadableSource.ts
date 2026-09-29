import { ChannelsLogStorage, MemoryLogStorage, Trace, type LogReadResult } from "@andymitchell/logging";
import { TraceViewer } from "@andymitchell/logging/get-traces";

/** How a failure from the unreadable store is labelled (`failures[].source`). */
export const UNREADABLE_SOURCE = 'UnreadableLogStorage:archive';

/** A store that records entries but cannot read them back, as an IndexedDB database can when it breaks. */
class UnreadableLogStorage extends MemoryLogStorage {
    protected override readonly storeName: string = 'UnreadableLogStorage';

    protected override queryEntries(): Promise<LogReadResult<never>> {
        return Promise.reject(new Error('The disk is unreadable'));
    }
}

/**
 * A trace viewer over an app's two stores, both of which recorded the same "Checkout" trace (with one
 * "Card declined" log), but only one of which can be read back.
 *
 * Its answers are partial: the Checkout trace from the readable store, and an error naming {@link UNREADABLE_SOURCE}.
 */
export async function viewerWithAnUnreadableSource(): Promise<TraceViewer> {
    const storage = new ChannelsLogStorage('app', [
        { storage: new MemoryLogStorage('recent') },
        { storage: new UnreadableLogStorage('archive') },
    ]);
    const checkout = new Trace(storage, 'Checkout');
    await checkout.error('Card declined');
    await checkout.end();
    return new TraceViewer(storage);
}
