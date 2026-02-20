import throttle from 'lodash.throttle'

export function makeRateLimited(fn: (...args: any[]) => any, wait = 500) {
  return throttle(fn, wait, { leading: true, trailing: false })
}
