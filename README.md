# lambda-continue
Chaining lambda call to beat 15minutes execution

## Installation

```
npm i --save lambda-continue
```

## Usage

```ts
import { createHandler } from 'lambda-continue'

// Your lambda Handler
export const handler = (event, context) => {
  const payload_a = event.body?.payload_a
  const h = createHandler((offset, continueContext) => {
    // do your stuff continue from given offset.
    for(const i = offset; i < 100000000; i++) {
      // Halt if needed.
      if (continueContext.shouldStop()) {
        return i
      }

      // do long running process here!
    }
  }, {
    cycleMinutes: 12,           // execute at maximum 12 minutes per cycle
    cycleAllowed: 3,            // execute at maximum 3 times
    lambdaFunctionName: 'Your-Lambda-Function-Name!',
    extraPayload: {
      payload_a: payload_a,    // Keep passing the original payloads to make sure our next execution keep going with the correct parameters.
    },
    lambda: new AWS.Lambda(),   // customize your Lambda here!
  }))

  return h(event, context)
}
```
