import { MemoryLogStorage, Trace } from "@andymitchell/logging";
import { TraceViewer } from "@andymitchell/logging/get-traces";
import type { GetTracesFn } from "../trace/types.ts";

/**
 * Build a {@link GetTracesFn} over an in-memory trace with one nested span, for the live harness.
 */
export const generateTestLogFetch:(() => GetTracesFn) = () => {
    const logger = new MemoryLogStorage('');


    // Initialise some events:
    const trace = new Trace(logger, 'T0', { 'name': 'Bob' });
    trace.log("First moment", { name: 'Sue' });
    const span1 = trace.startSpan('T1', { color: 'blue' });
    span1.error("Oh jeez no!");
    trace.log("Well that was that");

    const testLogFetch:GetTracesFn = async (filter?, includeAllTraceEntries?) => {


        const viewer = new TraceViewer(logger);
        const result = await viewer.getTraces(filter, includeAllTraceEntries);

        return result;
    }

    return testLogFetch;
}
