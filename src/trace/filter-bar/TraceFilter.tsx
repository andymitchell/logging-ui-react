import type { FC } from "react";
import { FullTextSearchDropdown } from "./FullTextSearchDropdown.tsx";
import { LogLevelsDropdown } from "./LogLevelsDropdown.tsx";
import { MessageDropdown } from "./MessageDropdown.tsx";
import { TimeDropdown } from "./TimeDropdown.tsx";


interface TraceFilterProps {
    //onSearch: (query: WhereFilterDefinition) => void;
}

/**
 * A bar of dropdown controls for filtering traces by message text, log level, time range and full text.
 *
 * Message matches a literal, case-sensitive substring; full text matches anywhere in an entry's serialised data;
 * time bounds are epoch milliseconds. Inputs apply 500ms after typing stops.
 *
 * @example
 * <FilterProvider>
 *     <TraceFilter />
 * </FilterProvider>
 *
 * @remarks
 * Must be rendered inside a {@link FilterProvider}; it throws otherwise.
 */
export const TraceFilter: FC<TraceFilterProps> = ({  }) => {


    return (
        <div>
            <MessageDropdown />
            <LogLevelsDropdown  />
            <TimeDropdown />


            <FullTextSearchDropdown />
        </div>
    )

    /*
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setInputValue(e.target.value);
    };

    const handleSearch = () => {
        // Create a basic filter that searches by message.
        const filter: WhereFilterDefinition<{message?:string}> = { message: literalContains(inputValue) }; // import literalContains from ./escapeRegExp.ts
        onSearch(filter);
    };
    

    return (
        <div style={{ marginBottom: '1rem' }}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Search logs..."
            />
            
        </div>
    );
    */
};

