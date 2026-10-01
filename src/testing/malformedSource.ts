import type { GetTracesFn } from "../trace/types.ts";

/**
 * A function source that resolves `answer` whatever it is asked, as a source written in JavaScript, or one
 * built for an older `@andymitchell/logging`, can.
 */
export function sourceAnswering(answer: unknown): GetTracesFn {
    return (async () => answer) as GetTracesFn;
}
