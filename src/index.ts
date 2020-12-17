import AWS from 'aws-sdk'
import { Handler } from 'aws-lambda'

export interface ContinueCycleContext<C> {
  /**
   * Value that carry overfrom previous cycle
   */
  beginOffset: C

  /**
   * Safety net.
   * 
   * To prevent lambda from executing forever. (Keep spawning itself)
   * cycleAllowed must be provided to set the maximum iteration count allowed.
   */
  cycleAllowed: number

  /**
   * Number of minutes allowed to execute one cycle.
   */
  cycleMinutes: number

  /**
   * A method to check if execution should be halted.
   */
  shouldStop(): boolean
}

/**
 * A callable method that responsible for executing
 */
export interface ExecuteCycle<C> {
  (offset: C, context: ContinueCycleContext<C>): Promise<C | 'finished'>
}

export interface LambdaContinueOptions {
  cycleMinutes: number
  cycleAllowed: number
  lambdaFunctionName: string
  lambda?: AWS.Lambda
  extraPayload?: { [key: string]: any }
}

export const createHandler = <C>(runner: ExecuteCycle<C>, options: LambdaContinueOptions): Handler => async (event): Promise<void> => {
  const startMs = (new Date().getTime())
  const beginOffset = event?.offset || 0
  const cycleMinutes = event?.cycleMinutes || options.cycleMinutes || 12
  const cycleAllowed = event?.cycleAllowed || options.cycleAllowed || 3
  const execContext: ContinueCycleContext<C> = {
    beginOffset,
    cycleAllowed,
    cycleMinutes,
    shouldStop: () => ((new Date().getTime()) - startMs) > (cycleMinutes * 60 * 1000)
  }
  let nextOffset: C | 'finished'
  try {
    nextOffset = await runner(beginOffset, execContext)
  } catch (e) {
    console.error(`lambda.continue ERR - runner throws an error.`)
    throw e
  }

  // Warning detection
  if (nextOffset === beginOffset) {
    console.error(`lambda.continue WRN - runner produce the same nextOffset (${nextOffset}) value as input beginOffset (${beginOffset}) -- have your index should move at least some value otherwise next execution will repeat the same result.`)
  }

  // Finalized
  if (nextOffset === 'finished') {
    console.info(`lambda.continue INF - runner has finished its execution.`)
    return
  }
  // Cycle has been used up!
  else if (cycleAllowed <= 1) {
    console.info(`lambda.continue INF - safety cycle depleted with nextOffset (${nextOffset}).`)
    return
  }
  // Schedule a next cycle
  console.info(`lambda.continue INF - schedule a next cycle with nextOffset (${nextOffset}), cycleAllowed (${cycleAllowed - 1}), cycleMinutes (${cycleMinutes}).`)
  const lambda = options.lambda ?? new AWS.Lambda()
  await lambda.invoke({
    FunctionName: options.lambdaFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({
      ...options.extraPayload,
      offset: nextOffset,
      cycleAllowed: cycleAllowed - 1,
      cycleMinutes,
    }),
  }).promise()
}
