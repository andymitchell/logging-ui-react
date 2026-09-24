
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TraceInspector } from '../../../src/index.ts'
import { generateTestLogFetch } from '../../../src/testing/testLogFetch.ts';





const testLogFetch = generateTestLogFetch();


createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div>
            <h1>Trace Search</h1>
            <TraceInspector tracesSource={testLogFetch} template='neutral' />
        </div>
    </StrictMode>,
  )
