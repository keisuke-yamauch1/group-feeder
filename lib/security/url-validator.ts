const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
]

export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    const hostname = parsed.hostname

    if (hostname === 'localhost') {
      return false
    }

    if (PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname))) {
      return false
    }

    return true
  } catch {
    return false
  }
}
