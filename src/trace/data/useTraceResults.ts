import type { TracesSource } from "../types.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoggingError } from "@andymitchell/logging";
import type { TraceFilter, TraceSearchResults } from "@andymitchell/logging/get-traces";
import { getTracesFromSource } from "./getTracesFromSource.ts";


/**
 * Load traces from `source` whenever `query` or `source` changes, keeping only the latest answer.
 *
 * @param query The filter; omit it to load every trace. A new object each render re-runs the load, so memoise it.
 *
 * @returns
 * - `data`: the latest answer's traces (`null` until one arrives). A partial answer sets them too.
 * - `loggingError`: the latest answer's `error`, naming the log sources that could not be read, or `undefined`
 *   when every source answered.
 * - `error`: set when a function source throws or rejects; `data` and `loggingError` keep the last answer.
 * - `loading`: a load is in progress.
 */
export function useTraceResults(
    source: TracesSource,
    query?: TraceFilter,
    includeAllTraceEntries?: boolean
) {
    const loadingIdRef = useRef(0);
    const [data, setData] = useState<TraceSearchResults | null>(null);
    const [loggingError, setLoggingError] = useState<LoggingError | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        loadingIdRef.current++;
        const loadingId = loadingIdRef.current;

        (async () => {


            try {
                const result = await getTracesFromSource(source, query, includeAllTraceEntries);

                if( loadingIdRef.current!==loadingId ) return;
                setData(result.traces);
                setLoggingError(result.error);
            } catch(e) {
                if( e instanceof Error ) setError(e);
            } finally {
                setLoading(false);
            }
        })();


    }, [query, source]);

    return { data, loggingError, loading, error };
}


/**
 * Convert a trace ID into a query, then return a single trace result
 * @param traceId
 * @param traceFetcher
 * @returns
 */
export function useTrace(

    source: TracesSource,
    traceId: string) {

    const traceFilter:TraceFilter = useMemo(() => {
        return {entries_filter: {
            'meta.span.top_id': traceId
        }};
    }, [traceId])

    const { data, loggingError, loading, error } = useTraceResults(source, traceFilter);

    const result = useMemo(() => {
        const trace = data? data[0] : undefined;
        return {trace, loggingError, loading, error};
    }, [data, loggingError, loading, error])

    return result;

}
