import type { CSSProperties, Ref } from "react";

/**
 * Props accepted by every component that renders its own top-level element, for styling and DOM access.
 *
 * @example
 * <TraceView traceId={id} tracesSource={viewer} className="traces" style={{ maxHeight: 400 }} />
 */
export type BaseComponentTypes = {

    /**
     * Access to the top-level element.
     *
     * @remarks
     * Forwarded as a plain prop, which React 19 supports. React 18 strips `ref` from function component props,
     * so there it is always `undefined`.
     */
    ref?: Ref<HTMLDivElement>,

    /**
     * Style the top-level element.
     */
    style?: CSSProperties,

    /**
     * Give a custom class name to the top-level element.
     *
     * The major inner elements carry a `data-container` attribute (e.g. `row`, `span`, `log`) that CSS can target.
     */
    className?: string
}


/**
 * The display fields of one log entry.
 */
export type TLogBody = {
    message: string,
    timestamp: number,
    trace_id: string
}

/**
 * A log entry in the rendered span tree.
 */
export type TLog = {
    type: 'log',
    id: string,
    body: TLogBody,
}

/**
 * A span in the rendered span tree, holding its logs and child spans in recorded order.
 */
export type TSpan = {
    type: 'span',
    id: string,
    /**
     * Logs are nested in a waterfall. The depth represents their indentation level.
     */
    depth: number,
    ulid: string,
    body: TLogBody,
    children: Array<TLog | TSpan>
}
