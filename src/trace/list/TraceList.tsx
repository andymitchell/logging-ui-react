import { useCallback, useEffect, useMemo, useState, type FC } from "react";

import { convertLogSpanEntryToBody } from "../convertLogToTree.ts";
import type { TraceResult, TraceSearchResults } from "@andymitchell/logging/get-traces";

import type { TracesSource } from "../types.ts";
import { getTracesFromSource } from "../data/getTracesFromSource.ts";
import { LogBody } from "../common-components/LogBody.tsx";





interface TraceListProps {
    /**
     * Either a TraceViewer object or a GetTracesFn
     */
    tracesSource: TracesSource;
    onClick?: (traceId:string) => void;
}


export const TraceList: FC<TraceListProps> = ({
    tracesSource,
    onClick
}) => {


    const [traces, setTraces] = useState<TraceSearchResults>([]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const newEntries = await getTracesFromSource(tracesSource);

            if( cancelled ) return;
            setTraces(newEntries);

        })();
        return () => {
            cancelled = true;
        }
    }, [tracesSource]);

    return (
        <div data-container='traces-list'>
            {traces.map(trace => (<Row key={trace.id} trace={trace} onClick={onClick} />))}

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
