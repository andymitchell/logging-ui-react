import type { MinimumContext } from "@andymitchell/logging";
import type { GetTracesResult, TraceFilter } from "@andymitchell/logging/get-traces";
import type { TracesSource } from "../types.ts";

/**
 * Load traces from either kind of {@link TracesSource}: a viewer or a plain function.
 *
 * @param source Any `ITraceViewer` (a `TraceViewer`, or one of your own), or a function with the same signature as
 * `TraceViewer.getTraces`.
 * @param filter Optional filter. Omit it to load every trace.
 * @param includeAllTraceEntries Whether each result's `logs` holds every entry in the trace (the source's default when omitted).
 * @returns What the source resolved, unchanged: `{ ok, traces, error? }`. When some log sources could not be read,
 * `traces` holds what the others returned and `error` names the ones that failed.
 *
 * @remarks
 * A source that throws or rejects is not caught here; the caller handles it. An answer that is not
 * `{ ok, traces }` rejects with an error that says so, for the caller to show like any other failed load. A source
 * built for `@andymitchell/logging` before 0.15.0 answers with a bare array of traces, for example.
 *
 * Only that outer shape is checked, not each trace or entry, so a source on any logging version from 0.15.0 works.
 *
 * Any object is treated as a viewer, so a `TraceViewer` from another installed copy of `@andymitchell/logging`
 * works too.
 */
export async function getTracesFromSource<T extends MinimumContext = any>(
    source: TracesSource,
    filter?: TraceFilter<T>,
    includeAllTraceEntries?: boolean
): Promise<GetTracesResult<T>> {
    const answer: unknown = typeof source === 'function'
        ? await source<T>(filter, includeAllTraceEntries)
        : await source.getTraces<T>(filter, includeAllTraceEntries);
    if( !isTraceResultsAnswer<T>(answer) ) throw new Error(NOT_A_TRACE_RESULTS_ANSWER);
    return answer;
}


const NOT_A_TRACE_RESULTS_ANSWER = 'The traces source answered with something other than { ok, traces }. A source built for @andymitchell/logging before 0.15.0 answers with a bare array of traces: upgrade it.';

/** Whether `answer` has the shape the components read: `{ ok, traces }`, with `traces` a list. */
function isTraceResultsAnswer<T extends MinimumContext>(answer: unknown): answer is GetTracesResult<T> {
    return typeof answer === 'object' && answer !== null
        && 'ok' in answer && typeof answer.ok === 'boolean'
        && 'traces' in answer && Array.isArray(answer.traces);
}
