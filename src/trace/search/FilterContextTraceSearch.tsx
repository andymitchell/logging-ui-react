
import type { FC } from "react";
import type { TracesSource } from "../types.ts";

import { useFilterQuery } from "../filter-bar/FilterContext.tsx";
import { TraceSearch } from "./TraceSearch.tsx";


interface FilterContextTraceSearchProps {
    /**
     * Any `ITraceViewer` (e.g. a `TraceViewer`), or a `GetTracesFn`. See `TracesSource`.
     */
    tracesSource: TracesSource;
    onClick?: (traceId:string) => void;
}


export const FilterContextTraceSearch: FC<FilterContextTraceSearchProps> = ({
    tracesSource,
    onClick
}) => {

    const traceFilter = useFilterQuery();


    return (
        <div>

            {traceFilter &&
            (<TraceSearch tracesSource={tracesSource} query={traceFilter} onClick={onClick}/>)
            }


        </div>
    );

};
