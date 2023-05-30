// experimental audio processor
let every = 100;
let i = 1;
class SilenceDetector extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const [ input ] = inputs;
    const [ channel_1, channel_2 ] = input;
    if (input) {
      //console.log('hello from components');
      const sum1 = channel_1.reduce((_a, _v) => (_a ?? 0) + Math.abs(_v));
      const sum2 = channel_2.reduce((_a, _v) => (_a ?? 0) + Math.abs(_v));
      const sum = sum1 + sum2;
      if ((i++ % every) == 0) {
          i = 1;
          console.log('sum1', sum1);
          console.log('sum2', sum2);
          console.log('sum', sum);
      }
      return true;
    }
  }
}

registerProcessor('silence-detector', SilenceDetector);
