const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const LOOKUP = (() => {
  const table = new Int8Array(256).fill(-1);
  for (let index = 0; index < ALPHABET.length; index += 1) {
    table[ALPHABET.charCodeAt(index)] = index;
  }
  return table;
})();

/**
 * 네이티브가 넘긴 픽셀 샘플을 바이트 배열로 되돌린다.
 * Hermes의 atob 지원 여부가 버전마다 달라서 직접 디코딩한다.
 */
export function decodeBase64(input: string): Uint8Array {
  let length = input.length;
  while (length > 0 && input.charCodeAt(length - 1) === 61) {
    length -= 1;
  }

  const output = new Uint8Array(Math.floor((length * 3) / 4));
  let outputIndex = 0;
  let buffer = 0;
  let bits = 0;

  for (let index = 0; index < length; index += 1) {
    const value = LOOKUP[input.charCodeAt(index)];
    if (value < 0) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output[outputIndex] = (buffer >> bits) & 0xff;
      outputIndex += 1;
    }
  }

  return outputIndex === output.length ? output : output.subarray(0, outputIndex);
}
