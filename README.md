# lambda-continue
Chaining lambda call to beat 15minutes execution

## Installation

```
npm i --save lambda-continue
```

## Usage

```
import { createHandler } from 'lambda-continue'

// Your lambda Handler
export const handler = (event, context) => {
  const h = createHandler((offset, continueContext) => {
    // do your stuff continue from given offset.
    for(const i = offset; i < 100000000; i++) {
      // Halt!
      if (continueContext.shopStop()) {
        return i
      }

      await continueContext.assertCancellation(offset)

      // do long running process here!
    }
  }, {
    cycleMinutes: 12,           // execute at maximum 12 minutes per cycle
    cycleAllowed: 3,            // execute at maximum 3 times
    lambdaFunctionName: 'Your-Lambda-Function-Name!',
    lambda: new AWS.Lambda(),   // customize your Lambda here!
  }))

  return h(event, context)
}
```