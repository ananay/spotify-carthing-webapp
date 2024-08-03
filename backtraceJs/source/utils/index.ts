const crypto = window.crypto; // needed for uuid function

/**
 * Generate a UUID
 */
export function uuid(): string {
  const uuidArray = new Uint8Array(16);
  crypto.getRandomValues(uuidArray);
  const hexStr = (b: number) => {
    const s = b.toString(16);
    return b < 0x10 ? '0' + s : s;
  };
  let result = '';
  let i = 0;
  for (; i < 4; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 6; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 8; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 10; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 16; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  return result;
}

/**
 * Current unix time in seconds.
 */
export function currentTimestamp(millis = false): number {
  return Math.floor(new Date().getTime() / (millis ? 1 : 1000));
}

/**
 * Get 'backtrace-guid' from localStorage. Will create and store if not set.
 */
export function getBacktraceGUID(): string {
  let guid = window.localStorage.getItem('backtrace-guid');
  if (!guid) {
    guid = uuid();
    window.localStorage.setItem('backtrace-guid', guid);
  }
  return guid;
}

type EndpointParameters = {
  universe: string | undefined;
  token: string | undefined;
};
/**
 * Get universe and token from the endpoint.
 */
export function getEndpointParams(
  endpoint: string,
  token?: string,
): EndpointParameters | undefined {
  if (!endpoint) {
    return undefined;
  }

  if (endpoint.indexOf('submit.backtrace.io') !== -1) {
    const positionFilter = 'backtrace.io/';
    const startPosition =
      endpoint.indexOf('backtrace.io/') + positionFilter.length;
    if (startPosition === -1) {
      return undefined;
    }
    const indexOfTheEndOfTheUniverseName = endpoint.indexOf('/', startPosition);
    if (indexOfTheEndOfTheUniverseName === -1) {
      return undefined;
    }
    const universeName = endpoint.substring(
      startPosition,
      indexOfTheEndOfTheUniverseName,
    );

    if (!token) {
      const lastSeparatorIndex = endpoint.lastIndexOf('/');
      if (lastSeparatorIndex === indexOfTheEndOfTheUniverseName) {
        return undefined;
      }
      token = endpoint.substring(
        indexOfTheEndOfTheUniverseName + 1,
        lastSeparatorIndex,
      );
      if (!token || token.length !== 64) {
        return undefined;
      }
    }

    return { universe: universeName, token };
  }

  const backtraceSubmissionUrl = new URL(endpoint).hostname;
  const firstSeparatorIndex = backtraceSubmissionUrl.indexOf('.');
  // unvalid submission URL
  if (firstSeparatorIndex === -1) {
    return undefined;
  }
  return {
    token,
    universe: backtraceSubmissionUrl.substring(0, firstSeparatorIndex),
  };
}
