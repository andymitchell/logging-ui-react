
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { generateTestLogFetch } from '../../../src/testing/testLogFetch.ts';
import { TraceView } from '../../../src/index.ts';



const testLogFetch = generateTestLogFetch();

const result = await testLogFetch();
const traceId = result[0]!.id;


createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div>
            <h1>Trace View</h1>
            <TraceView traceId={traceId} tracesSource={testLogFetch} />
        </div>
    </StrictMode>,
  )
