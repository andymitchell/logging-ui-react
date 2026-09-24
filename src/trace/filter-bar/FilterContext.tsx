import type { WhereFilterDefinition } from "@andymitchell/objects/where-filter";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FC, type PropsWithChildren } from "react";
import type { TraceFilter } from "@andymitchell/logging/get-traces";

export type ComponentEntriesFilterData<T extends Record<string, any> = Record<string, any>> = WhereFilterDefinition<T> | undefined;
export type ComponentEntriesFilters<T extends Record<string, any> = Record<string, any>> = Record<string, ComponentEntriesFilterData<T>>;

type FilterContextType<T extends Record<string, any> = Record<string, any>> = {
    /**
     * The computed TraceFilter, used for searches
     */
    traceFilter: TraceFilter,

    /**
     * The computerd entries filter, used for searches 
     */
    entries_filter: WhereFilterDefinition<T> | undefined,

    /**
     * The filter for each component (will be combined to create the final 'filter') 
     */
    componentEntriesFilters: ComponentEntriesFilters<T>;

    /**
     * Helper function to update the filter for a component 
     * 
     * @param id 
     * @param data 
     * @returns 
     */
    setComponentEntriesFilter: (id: string, data:ComponentEntriesFilterData<T>) => void;



    /**
     * Optional string that will match anywhere in the serilalised log.
     * 
     */
    entries_full_text_search?: string;

    setEntriesFullTextSearch: (text?:string) => void;

    isInitializing: boolean;

    /**
     * Each component should register itself, so the context can calculate when everything is initialised and can start filtering. 
     * @param id 
     * @returns 
     */
    registerComponent: (id: string) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

type FilterProviderProps = PropsWithChildren<{
    /**
     * Starting filter per filter control, keyed by the control's id (`message`, `log-level`, `time`).
     */
    initialComponentEntriesFilters?: ComponentEntriesFilters;

    /**
     * When the combined filter first becomes available. `debounce` waits 200ms after the last control registers;
     * `expected_components` waits for `expectation` controls to register. Omit it to start immediately.
     */
    initializedCriteria?: {
        type: 'debounce'
    } | {
        type: 'expected_components',
        expectation: number
    }
}>;

/**
 * Holds the shared search state that the filter controls in {@link TraceFilter} edit, and combines them into one trace filter.
 *
 * Each control writes its own part (message, levels, time range, full text); the provider ANDs them together.
 * Components inside it read the combined query with {@link useFilterQuery}, e.g. to feed a `TraceSearch`.
 * Until initialisation completes (see `initializedCriteria`), the combined entries filter stays empty, so the
 * filter doesn't change once per control as the controls mount.
 *
 * @example
 * const Results = () => <TraceSearch tracesSource={viewer} query={useFilterQuery()} />;
 *
 * <FilterProvider initializedCriteria={{ type: 'debounce' }}>
 *     <TraceFilter />
 *     <Results />
 * </FilterProvider>
 */
export const FilterProvider: FC<FilterProviderProps> = ({
    initialComponentEntriesFilters,
    initializedCriteria,
    children,
}) => {
    const [componentEntriesFilters, setComponentEntriesFilters] = useState<ComponentEntriesFilters>(initialComponentEntriesFilters || {});
    const [readyComponents, setReadyComponents] = useState<Set<string>>(new Set());
    const [isInitializing, setIsInitializing] = useState(true);
    const [entries_full_text_search, setEntriesFullTextSearch] = useState<string | undefined>();

    const registerComponent = useCallback((id: string) => {
        setReadyComponents((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    // Create a helper function 
    const setComponentEntriesFilter = (id:string, data:ComponentEntriesFilterData) => {
        setComponentEntriesFilters(prev => ({
            ...prev,
            [id]: data
        }))
    }

    // Calculate if everything is initialised 
    useEffect(() => {
        let timeout:ReturnType<typeof setTimeout> | undefined;
        if( initializedCriteria ) {
            const type = initializedCriteria.type;
            switch(type) {
                case 'expected_components':
                    if (readyComponents.size >= initializedCriteria.expectation) {
                        setIsInitializing(false);
                    }
                    break;
                case 'debounce':
                    timeout = setTimeout(() => {
                        setIsInitializing(false);
                    }, 200);
                    break;
                default:
                    
                    const missingType:never = type;
                    void missingType;
                    throw new Error("Unknown type");
            }
            
        } else {
            // No criteria - it's ready immediately 
            setIsInitializing(false);
        }
        return () => {
            if( timeout ) {
                // Create debounce logic
                clearTimeout(timeout);
            }
        }
    }, [readyComponents, initializedCriteria]);

    const entries_filter = useMemo(() => {
        if( isInitializing ) return undefined;

        const componentEntriesFiltersArr = Object.values(componentEntriesFilters).filter(x => !!x);
        const newFilter = componentEntriesFiltersArr.length>0? 
            {
                $and: componentEntriesFiltersArr
            }
            :
            undefined; // {}
        
        return newFilter;
    }, [componentEntriesFilters, isInitializing])

    const traceFilter:TraceFilter = useMemo(() => {
        const traceFilter:TraceFilter = {
            entries_filter: entries_filter,
            entries_full_text_search,
        }
        return traceFilter;
    }, [entries_filter, entries_full_text_search])

    const value:FilterContextType = useMemo(() => ({
        traceFilter, entries_filter, componentEntriesFilters, setComponentEntriesFilter, isInitializing, registerComponent, entries_full_text_search, setEntriesFullTextSearch
    }), [
        traceFilter, entries_filter, componentEntriesFilters, setComponentEntriesFilter, isInitializing, registerComponent, entries_full_text_search, setEntriesFullTextSearch
    ])

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilterContext = <T extends Record<string, any> = Record<string, any>>(): FilterContextType<T> => {
    const context = useContext(FilterContext);
    if (!context) throw new Error("useFilterContext must be used within a FilterProvider");
    return context;
};

/**
 * Read the trace query built by the filter controls of the enclosing {@link FilterProvider}.
 *
 * Pass it to `TraceSearch` (or your own `getTraces` call) to lay out the filter controls and the results
 * yourself: the search then re-runs whenever a control changes the filter.
 *
 * @returns The combined query, as a `TraceFilter` from `@andymitchell/logging/get-traces`. It is the same object
 * until a filter changes, so it is safe to use as a dependency or to pass straight to `TraceSearch`.
 *
 * @example
 * const Results = ({ viewer }: { viewer: TraceViewer }) => (
 *     <TraceSearch tracesSource={viewer} query={useFilterQuery()} />
 * );
 *
 * <FilterProvider>
 *     <TraceFilter />
 *     <Results viewer={viewer} />
 * </FilterProvider>
 *
 * @remarks
 * Must be called in a component rendered inside a `FilterProvider`; it throws otherwise.
 *
 * While no control has a value, and until the provider finishes initialising (see its `initializedCriteria`), the
 * query filters nothing: a search returns every trace but marks no entry as a match, so `TraceSearch` lists nothing.
 */
export const useFilterQuery = (): TraceFilter => useFilterContext().traceFilter;
