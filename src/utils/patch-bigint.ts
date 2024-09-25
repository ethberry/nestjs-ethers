export function patchBigInt() {
  // https://github.com/GoogleChromeLabs/jsbi/issues/30
   
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function () {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.toString();
    },
    configurable: true,
    enumerable: false,
    writable: true,
  });
}
