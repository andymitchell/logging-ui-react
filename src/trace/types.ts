import type { MinimumContext } from "@andymitchell/logging";
import type { GetTracesResult, TraceFilter, TraceViewer } from "@andymitchell/logging/get-traces";

/**
 * A function that returns traces, with the same signature as `TraceViewer.getTraces`.
 *
 * Use it to supply traces from somewhere other than a local `TraceViewer`, e.g. a server endpoint. It resolves what
 * `TraceViewer.getTraces` resolves: `{ ok, traces, error? }`, where `traces` holds every trace that could be read and
 * `error` names the log sources that could not.
 *
 * @example
 * // The server answers with what its own `viewer.getTraces(filter)` resolved.
 * const fromServer: GetTracesFn = async (filter) => (await fetch('/traces', { method: 'POST', body: JSON.stringify(filter) })).json();
 */
export type GetTracesFn = <T extends MinimumContext = any>(
    filter?: TraceFilter<T>,
    includeAllTraceEntries?: boolean
) => Promise<GetTracesResult<T>>;


/**
 * Where the components load traces from: a `TraceViewer` attached to log storage, or a {@link GetTracesFn}.
 */
export type TracesSource = TraceViewer | GetTracesFn;
