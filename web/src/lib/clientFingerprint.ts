interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    mobile?: boolean
    platform?: string
    brands?: Array<{ brand: string; version: string }>
  }
  deviceMemory?: number
}

export function collectClientFingerprint() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null
  }

  const nav = navigator as NavigatorWithUserAgentData
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: Array.from(navigator.languages ?? [navigator.language]).filter(Boolean).slice(0, 8),
    platform: navigator.platform,
    userAgentDataPlatform: nav.userAgentData?.platform,
    userAgentDataMobile: nav.userAgentData?.mobile,
    webdriver: navigator.webdriver,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    deviceMemory: nav.deviceMemory,
    cookieEnabled: navigator.cookieEnabled,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
    },
  }
}

export function clientFingerprintHeader(): Record<string, string> {
  const fingerprint = collectClientFingerprint()
  if (!fingerprint) {
    return {}
  }

  try {
    return {
      'x-client-fingerprint': encodeURIComponent(JSON.stringify(fingerprint)),
    }
  } catch {
    return {}
  }
}
