"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandler = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const createHandler = (runner, options) => async (event) => {
    var _a;
    const startMs = (new Date().getTime());
    const beginOffset = (event === null || event === void 0 ? void 0 : event.offset) || 0;
    const cycleMinutes = (event === null || event === void 0 ? void 0 : event.cycleMinutes) || options.cycleMinutes || 12;
    const cycleAllowed = (event === null || event === void 0 ? void 0 : event.cycleAllowed) || options.cycleAllowed || 3;
    const execContext = {
        beginOffset,
        cycleAllowed,
        cycleMinutes,
        shouldStop: () => ((new Date().getTime()) - startMs) > (cycleMinutes * 60 * 1000)
    };
    let nextOffset;
    try {
        nextOffset = await runner(beginOffset, execContext);
    }
    catch (e) {
        console.error(`lambda.continue ERR - runner throws an error.`);
        throw e;
    }
    // Warning detection
    if (nextOffset === beginOffset) {
        console.error(`lambda.continue WRN - runner produce the same nextOffset (${nextOffset}) value as input beginOffset (${beginOffset}) -- have your index should move at least some value otherwise next execution will repeat the same result.`);
    }
    // Finalized
    if (nextOffset === 'finished') {
        console.info(`lambda.continue INF - runner has finished its execution.`);
        return;
    }
    // Cycle has been used up!
    else if (cycleAllowed <= 1) {
        console.info(`lambda.continue INF - safety cycle depleted with nextOffset (${nextOffset}).`);
        return;
    }
    // Schedule a next cycle
    console.info(`lambda.continue INF - schedule a next cycle with nextOffset (${nextOffset}), cycleAllowed (${cycleAllowed - 1}), cycleMinutes (${cycleMinutes}).`);
    const lambda = (_a = options.lambda) !== null && _a !== void 0 ? _a : new aws_sdk_1.default.Lambda();
    await lambda.invoke({
        FunctionName: options.lambdaFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({
            ...options.extraPayload,
            offset: nextOffset,
            cycleAllowed: cycleAllowed - 1,
            cycleMinutes,
        }),
    }).promise();
};
exports.createHandler = createHandler;
