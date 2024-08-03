/**
 * Supported browser names.
 */
const _supportedBrowserNames = ['safari', 'chrome', 'edge', 'opera', 'firefox'];

/**
 * Guess web browser version
 * @param name web browser name
 */
export function getBrowserVersion(name: string) {
  if (name === 'safari') {
    name = 'version';
  }
  if (name) {
    return (
      (new RegExp(name + '[\\/ ]([\\d\\w\\.-]+)', 'i').exec(
        navigator.appVersion,
      ) &&
        RegExp.$1) ||
      undefined
    );
  } else {
    const match = navigator.appVersion.match(/version[\/ ]([\d\w\.]+)/i);
    return match && match.length > 1 ? match[1] : undefined;
  }
}

/**
 * Guess web browser name
 */
export function getBrowserName() {
  const userAgent = navigator.userAgent.toLowerCase();

  for (const supportedBrowserName of _supportedBrowserNames) {
    if (userAgent.indexOf(supportedBrowserName) !== -1) {
      return supportedBrowserName;
    }
  }
  return 'unknown';
}

export function getOs() {
  const platform = window.navigator.platform;
  // guess mac
  const macNames = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  if (macNames.some((n) => n === platform)) {
    return 'MacOS';
  }
  // check if windows
  const windowsNames = ['Win32', 'Win64', 'Windows', 'WinCE'];
  if (windowsNames.some((n) => n === platform)) {
    return 'MacOS';
  }

  // check if iOS
  const mobileiOs = ['iPhone', 'iPad', 'iPod'];
  if (mobileiOs.some((n) => n === platform)) {
    return 'iOS';
  }
  // check if android
  if (window.navigator.userAgent.indexOf('Android') !== -1) {
    return 'Android';
  }
  // check if Linux
  if (
    navigator.appVersion.indexOf('Linux') ||
    navigator.appVersion.indexOf('X11')
  ) {
    return 'Linux';
  } else {
    return 'unknown';
  }
}

export function isMobile() {
  return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
    navigator.userAgent.toLowerCase(),
  );
}
