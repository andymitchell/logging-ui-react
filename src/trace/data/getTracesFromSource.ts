import type { MinimumContext } from "@andymitchell/logging";
import { TraceViewer, type TraceFilter, type TraceSearchResults } from "@andymitchell/logging/get-traces";
import type { TracesSource } from "../types.ts";

/**
 * Load traces from either kind of {@link TracesSource}: a `TraceViewer` or a plain function.
 *
 * @param source A `TraceViewer`, or a function with the same signature as `TraceViewer.getTraces`.
 * @param filter Optional filter. Omit it to load every trace.
 * @param includeAllTraceEntries Whether each result's `logs` holds every entry in the trace (the source's default when omitted).
 * @returns The traces the source returned, unchanged.
 *
 * @remarks
 * A `TraceViewer` is recognised with `instanceof`, so it must come from the same copy of `@andymitchell/logging`
 * that this package imports. With two copies installed, a viewer is treated as a function and the call throws.
 */
export function getTracesFromSource<T extends MinimumContext = any>(
    source: TracesSource,
    filter?: TraceFilter<T>,
    includeAllTraceEntries?: boolean
): Promise<TraceSearchResults<T>> {
    return source instanceof TraceViewer
        ? source.getTraces<T>(filter, includeAllTraceEntries)
        : source<T>(filter, includeAllTraceEntries);
}
