import Cookies from 'js-cookie'

export const cookie = {
  set(name: string, value: string, days = 7) {
    Cookies.set(name, value, { expires: days, sameSite: 'Lax' })
  },
  get(name: string) {
    return Cookies.get(name) ?? null
  },
  remove(name: string) {
    Cookies.remove(name)
  }
}
