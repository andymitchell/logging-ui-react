import { useCallback, useMemo, type FC } from "react";

import { convertLogSpanEntryToBody } from "../convertLogToTree.ts";
import type { TraceResult } from "@andymitchell/logging/get-traces";

import type { TracesSource } from "../types.ts";
import { useTraceResults } from "../data/useTraceResults.ts";
import { LogBody } from "../common-components/LogBody.tsx";
import { SourceFailures } from "../common-components/SourceFailures.tsx";





interface TraceListProps {
    /**
     * Either a TraceViewer object or a GetTracesFn
     */
    tracesSource: TracesSource;
    onClick?: (traceId:string) => void;
}


/**
 * List every trace in the source, one row per trace, labelled with its first entry.
 *
 * Shows an error line if a function source throws or rejects, and names any log sources that could not be read
 * alongside the traces the others returned.
 */
export const TraceList: FC<TraceListProps> = ({
    tracesSource,
    onClick
}) => {


    const { data, loggingError, error } = useTraceResults(tracesSource);

    return (
        <div data-container='traces-list'>
            {error && <div data-container='load-error'>Error: {error.message}</div>}
            <SourceFailures error={loggingError} />
            {(data ?? []).map(trace => (<Row key={trace.id} trace={trace} onClick={onClick} />))}

        </div>
    );
};


type RowProps = {
    trace:TraceResult,
    onClick?: (traceId:string) => void;
}
const Row: FC<RowProps> = ({
    trace,
    onClick
}) => {


    const body = useMemo(() => {
        const logEntry = trace.logs[0];
        return logEntry? convertLogSpanEntryToBody(logEntry) : undefined;
    }, [trace])

    const onClickWrapped = useCallback(() => {
        const traceId = trace.id;
        if( onClick ) {
            if( !traceId ) throw new Error("Expect trace id");
            onClick(traceId);
        }
    }, [trace]);

    return (
        <div onClick={onClickWrapped} data-container='row'>
            {body && (<LogBody body={body} />) }
        </div>
    );
};
