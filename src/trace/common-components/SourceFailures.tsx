import type { FC } from "react";
import type { LoggingError } from "@andymitchell/logging";

type SourceFailuresProps = {
    /**
     * The `error` of the latest traces result, or `undefined` when every log source answered.
     */
    error: LoggingError | undefined
}

/**
 * A one-line notice naming the log sources that could not be read, shown alongside the traces that could.
 *
 * Renders nothing when `error` is `undefined`. The full error message is in the element's `title`.
 */
export const SourceFailures: FC<SourceFailuresProps> = ({ error }) => {
    if( !error ) return null;

    const sources = [...new Set(error.failures.map(failure => failure.source))];
    return (
        <div data-container='source-failures' role='alert' title={error.message}>
            Some log sources could not be read, so entries may be missing: {sources.join(', ')}
        </div>
    );
};
