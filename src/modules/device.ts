import Bowser from 'bowser'

export function detectDevice() {
  try {
    const parser = Bowser.getParser(window.navigator.userAgent)
    return parser.getResult()
  } catch (e) {
    return { type: 'unknown' }
  }
}
