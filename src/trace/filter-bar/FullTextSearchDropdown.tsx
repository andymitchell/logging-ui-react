import { useCallback, useEffect, useMemo, type FC } from "react";
import { useFilterContext } from "./FilterContext.tsx";
import type { LogEntry } from "@andymitchell/logging";
import Dropdown from "../../utils/Dropdown.tsx";
import DelayedInput from "../../utils/DelayedInput.tsx";

const COMPONENT_ID = 'full_text_search';


export const FullTextSearchDropdown: FC = () => {
    

    const { entries_full_text_search, setEntriesFullTextSearch, registerComponent } = useFilterContext<LogEntry>();

    useEffect(() => {
        registerComponent(COMPONENT_ID);
    }, [registerComponent]);

    const inputValue: string = useMemo(() => {
        return entries_full_text_search ?? '';
    }, [entries_full_text_search])



    const onChange = useCallback((value:string) => {
        setEntriesFullTextSearch(value);
    }, []);
    


    return (
        <Dropdown label="Full Text Search">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                <DelayedInput
                    value={inputValue}
                    onChange={onChange}
                    delay={500}
                />

            </div>
        </Dropdown>
    )
};
