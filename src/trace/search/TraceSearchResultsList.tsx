import { useCallback, useMemo, type FC } from "react";

import { convertLogSpanEntryToBody } from "../convertLogToTree.ts";
import type { LogEntry, SpanMeta, TraceEntry } from "@andymitchell/logging";
import { LogBody } from "../common-components/LogBody.tsx";






interface TraceSearchResultsListProps {
    entries: TraceEntry<any>[];
    onClick?: (traceId:string) => void;
}


/**
 * List trace entries as clickable rows showing message, time and trace id.
 *
 * @example
 * <TraceSearchResultsList entries={results.flatMap(r => r.matches)} onClick={traceId => open(traceId)} />
 *
 * @remarks
 * Each row carries `data-container="row"`. `onClick` receives the id of the trace the entry belongs to; clicking
 * throws if the entry has no trace id.
 */
export const TraceSearchResultsList: FC<TraceSearchResultsListProps> = ({
    entries,
    onClick
}) => {


    return (
        <div data-container='trace-results'>
            {entries.map(entry => (<Row key={entry.ulid} entry={entry} onClick={onClick} />))}

        </div>
    );
};


type RowProps = {
    entry:LogEntry<any, SpanMeta>,
    onClick?: (traceId:string) => void;
}
const Row: FC<RowProps> = ({
    entry,
    onClick
}) => {


    const body = useMemo(() => {
        return convertLogSpanEntryToBody(entry)
    }, [entry])

    const onClickWrapped = useCallback(() => {
        const traceId = entry.meta?.span?.top_id;
        if( onClick ) {
            if( !traceId ) throw new Error("Expect trace id");
            onClick(traceId);
        }
    }, [entry])

    return (
        <div onClick={onClickWrapped} data-container='row' style={{marginTop: '5px'}}>
            <LogBody body={body} />
        </div>
    );
};
