
import { useMemo, type FC } from "react";
import { useTraceResults } from "../data/useTraceResults.ts";
import type { TracesSource } from "../types.ts";
import { TraceSearchResultsList } from "./TraceSearchResultsList.tsx";
import { SourceFailures } from "../common-components/SourceFailures.tsx";
import type { TraceFilter } from "@andymitchell/logging/get-traces";

interface TraceSearchProps {
    /**
     * Either a TraceViewer object or a GetTracesFn
     */
    tracesSource: TracesSource;
    query: TraceFilter,
    onClick?: (traceId:string) => void;
}


/**
 * Run a trace search and list the entries that matched it.
 *
 * Loads from `tracesSource` whenever `query` or the source changes (a new object each time re-runs the search, so
 * memoise it), showing a loading or error line meanwhile. Each matching entry renders as a row, as in
 * {@link TraceSearchResultsList}. When some log sources could not be read, it lists the matches the others
 * returned and names the ones that failed.
 *
 * @example
 * const query = useMemo(() => ({ entries_filter: { type: 'error' } }), []);
 * <TraceSearch tracesSource={viewer} query={query} onClick={setOpenTraceId} />
 */
export const TraceSearch: FC<TraceSearchProps> = ({
    tracesSource,
    query,
    onClick
}) => {

    const { data, loggingError, loading, error } = useTraceResults(tracesSource, query, false);

    const entries = useMemo(() => {
        if( data ) {

            return data.flatMap(x => x.matches);
        } else {
            return [];
        }
    }, [data]);


    return (
        <div>

            {loading && <div>Loading...</div>}
            {error && <div data-container='load-error'>Error: {error.message}</div>}
            <SourceFailures error={loggingError} />

            <TraceSearchResultsList entries={entries} onClick={onClick}/>


        </div>
    );

};
