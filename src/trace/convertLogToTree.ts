import { isEventLogEntry, isEventLogEntrySpanStart, type LogEntry, type SpanMeta } from "@andymitchell/logging";
import type { TLogBody, TSpan } from "../types.ts";


export function convertLogSpanEntryToBody(entry:LogEntry<any, SpanMeta>):TLogBody {
    if( isEventLogEntry(entry) && !isEventLogEntrySpanStart(entry) ) {
        return {
            message: "Unsupported. Do not pass in non-start events.",
            timestamp: entry.timestamp,
            trace_id: entry.meta?.span.top_id ?? ''
        }
    } else {
        return {
            message: entry.message ?? '',
            timestamp: entry.timestamp,
            trace_id: entry.meta?.span.top_id ?? ''
        }
    }
}



/** The label of a span whose start is not among the entries, e.g. one recorded in another log store. */
const SPAN_RECORDED_ELSEWHERE = 'Recorded elsewhere';

/**
 * Builds the tree the trace view draws from one trace's entries: each span holds its logs and child spans, in the
 * order they were recorded.
 *
 * A trace can carry on in another log store (e.g. from a web page into a browser extension), so the entries may name
 * spans that never started among them. Each such span is shown as a "Recorded elsewhere" placeholder, under a
 * placeholder for the trace's root, so everything recorded beneath it stays in the one tree.
 *
 * @param logEntries One trace's entries, in any order. The array is not changed.
 * @returns The trace's root span (or the placeholder standing in for it), or `undefined` when there are no entries.
 *
 * @remarks
 * Entries are ordered by `ulid`. Joined entries from two stores can order a span's start after entries recorded under
 * it (their clocks differ); the placeholder then takes the span's name when its start arrives.
 */
export function convertLogToTree(logEntries: LogEntry<any, SpanMeta>[]): TSpan | undefined {
    if (logEntries.length === 0) return;

    logEntries = [...logEntries].sort((a, b) => a.ulid.localeCompare(b.ulid)); // They have to be sorted for the nesting to work

    const lookup: Record<string, TSpan> = {};
    const placeholders = new Set<string>();
    let topSpan: TSpan | undefined;

    /** The span for `id`, which has not started among the entries so far: a placeholder under the trace root's. */
    const recordedElsewhere = (id: string, entry: LogEntry<any, SpanMeta>): TSpan => {
        const known = lookup[id];
        if (known) return known;
        const topId = entry.meta!.span.top_id;
        const parent = id === topId ? undefined : recordedElsewhere(topId, entry);
        const placeholder: TSpan = {
            type: 'span',
            id,
            ulid: entry.ulid,
            depth: parent ? parent.depth + 1 : 0,
            body: { message: SPAN_RECORDED_ELSEWHERE, timestamp: entry.timestamp, trace_id: topId },
            children: []
        };
        if (parent) parent.children.push(placeholder);
        lookup[id] = placeholder;
        placeholders.add(id);
        if (!topSpan) topSpan = placeholder;
        return placeholder;
    };

    for (const entry of logEntries) {
        const meta = entry.meta!;

        // Get the span this entry belongs to
        let span: TSpan | undefined = lookup[meta.span.id];
        if (isEventLogEntry(entry)) {
            if( isEventLogEntrySpanStart(entry) ) {
                if (span) {
                    if (!placeholders.has(span.id)) throw new Error("Span should not be created more than once");
                    // Its start arrived after entries recorded under it: the placeholder becomes the span
                    span.body = convertLogSpanEntryToBody(entry);
                    span.ulid = entry.ulid;
                    placeholders.delete(span.id);
                    continue;
                }

                let parent: TSpan | undefined;
                if (meta.span.parent_id) {
                    parent = recordedElsewhere(meta.span.parent_id, entry);
                }

                span = {
                    type: 'span',
                    id: meta.span.id,
                    ulid: entry.ulid,
                    depth: parent ? parent.depth + 1 : 0,
                    body: convertLogSpanEntryToBody(entry),
                    children: []
                }
                if (parent) parent.children.push(span);
                lookup[meta.span.id] = span;
                if (!topSpan) topSpan = span;
            }
        } else {
            if (!span) span = recordedElsewhere(meta.span.id, entry);

            // Push this Log to the span
            span.children.push({
                type: 'log',
                id: entry.ulid,
                body: convertLogSpanEntryToBody(entry)
            })



        }

    }

    return topSpan;
}
