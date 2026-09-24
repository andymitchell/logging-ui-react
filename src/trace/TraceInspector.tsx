import { useCallback, useMemo, useState, type CSSProperties, type FC } from "react";


import type { TracesSource } from "./types.ts";
import type { BaseComponentTypes } from "../types.ts";


import { TraceSelectAndView } from "./TraceSelectAndView.tsx";


/**
 * Class added to the root element by `template="neutral"`. The rule it scopes is inlined in a `<style>` element, so
 * consumers need no stylesheet import. The attribute selector is left unquoted so server rendering, which escapes
 * quotes in element text, cannot corrupt it.
 */
const NEUTRAL_CLASS = 'logging-ui-react-neutral';
const NEUTRAL_CSS = `.${NEUTRAL_CLASS} [data-container=row] { cursor: pointer; }`;


type TraceInspectorProps = BaseComponentTypes & {


    /**
     * Either a TraceViewer object or a GetTracesFn
     */
    tracesSource: TracesSource;

    /**
     * `'neutral'` adds minimal styling (a pointer cursor on clickable rows). Omit it to style everything yourself.
     */
    template?: 'neutral'
}


type Pane = 'list' | 'search';

/**
 * A complete trace browser: search or list traces, then click one to open it as a span tree.
 *
 * It has two panes, switched from its nav: "Search" (filter by message, level, time and full text) and "List"
 * (every trace). Clicking a row replaces the pane with that trace's {@link TraceView}, with a Back button.
 *
 * @example
 * const viewer = new TraceViewer(new IDBLogStorage('my-app'));
 * <TraceInspector tracesSource={viewer} template="neutral" />
 *
 * @remarks
 * The trace detail view renders entries with `react-json-view-lite`, whose stylesheet this package imports,
 * so the app's bundler must handle CSS imports.
 */
export const TraceInspector: FC<TraceInspectorProps> = (props) => {

    const className = useMemo(() => {
        let className = `${props.className ?? ''}`
        if( props.template==='neutral' ) {
            className += ` ${NEUTRAL_CLASS}`
        }
        return className;
    }, [props.className, props.template]);

    const style:CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        verticalAlign: 'top',
        ...props.style,
    }

    const [pane, setPane] = useState<Pane>('search');


    return (
        <div ref={props.ref} className={className} style={style}>

            {props.template==='neutral' && (<style>{NEUTRAL_CSS}</style>)}

            <nav>

                <div onClick={useCallback(() => setPane('search'), [])}>
                    <span>Search</span>
                </div>
                <div onClick={useCallback(() => setPane('list'), [])}>
                    <span>List</span>
                </div>

            </nav>

            <main>
                {pane==='search' && (
                    <div data-container='search-pane'>
                        <TraceSelectAndView tracesSource={props.tracesSource} selector={'search'} />
                    </div>
                )}

                {pane==='list' && (
                    <div data-container='list-pane'>
                        <TraceSelectAndView tracesSource={props.tracesSource} selector={'list'} />
                    </div>
                )}
            </main>


        </div>
    );
};
