import { useCallback, useState, type FC } from "react";
import { isLogEntrySimple, type LogEntry } from "@andymitchell/logging";
import { IDBLogStorage } from "@andymitchell/logging/browser";
import { TraceViewer, isTraceResult } from "@andymitchell/logging/get-traces";
import { monotonicFactory } from "ulid";

import { TraceInspector, type BaseComponentTypes, type TracesSource } from "../../../../src/index.ts";


type TraceInspectorProps = BaseComponentTypes & {



    template?: 'neutral'
}

const DB_ID = 'loggertest_1';

/**
 * A TraceInspector over an IndexedDB store that a "Load" button refills from pasted JSON (log entries or trace
 * results), for inspecting traces exported from elsewhere.
 */
export const PromptLoadedTraceInspector: FC<TraceInspectorProps> = (props) => {

    //TracesSource


    const generateViewerForEntries = useCallback((resetEntries?:LogEntry[]) => {
        const logger = new IDBLogStorage(DB_ID);
        if( resetEntries ) {
            logger.reset(resetEntries);
            console.log("Reset entries", resetEntries);
        }
        const viewer = new TraceViewer(logger);

        return viewer;

    }, []);

    const [tracesSource, setTracesSources] = useState<TracesSource | undefined>(generateViewerForEntries());

    const onClickLoad = useCallback(() => {
        const json = prompt("Enter json of an array of log entries or a TraceResults:");
        if( !json ) return;

        let obj:object;
        try {
            obj = JSON.parse(json);
        } catch(e) {
            alert("Could not parse json.");
            throw e;
        }

        let entries:LogEntry[] | undefined;
        if( Array.isArray(obj) ) {
            if( obj.every(isTraceResult) ) {
                // Flatten it down to its entries
                entries = obj.flatMap(x => x.logs);
            } else if( obj.every(isLogEntrySimple) ) {
                entries = obj;
            } else if( "all" in obj[0] ) {
                // Older format previously used
                // Flatten it down to entries
                let all = obj.flatMap(x => x.all);

                const entriesMap:Record<string, any> = {};
                all.forEach(x => entriesMap[x.id] = x);
                all = Object.values(entriesMap);

                all = all.sort((a,b) => a.timestamp-b.timestamp);


                const ulid = monotonicFactory();
                if( all.every(x => typeof x==='object' && x!==null && "type" in x) ) {
                    entries = all.map(x => {
                        if( x.meta?.trace ) {
                            x.meta.span = x.meta.trace;
                        }
                        x.ulid = ulid();
                        if( !x.message && x.meta.name ) {
                            x.message = x.meta.name;
                        }
                        return x;
                    });
                } else {
                    alert("Expected array of log entries");
                }
            }
        } else {
            alert("Expected array");
        }

        if( entries ) {
            console.log("Entries: ", entries);
            setTracesSources(generateViewerForEntries(entries));
        }
    }, [])


    return (
        <div>
            <button onClick={onClickLoad}>Load</button>
            {tracesSource &&
            (<TraceInspector
            tracesSource={tracesSource}
            template={props.template}
            />)
            }
        </div>
    )
}
