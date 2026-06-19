import Cookies from 'js-cookie'

export const cookie = {
  set(name: string, value: string, days = 7, opts?: Cookies.CookieAttributes) {
    Cookies.set(name, value, { 
      expires: days, 
      sameSite: 'Strict', 
      secure: true,
      ...opts 
    })
  },
  setSecure(name: string, value: string, opts?: Cookies.CookieAttributes) {
    Cookies.set(name, value, { 
      secure: true, 
      sameSite: 'Strict', 
      path: '/',
      ...opts 
    })
  },
  get(name: string) {
    return Cookies.get(name) ?? null
  },
  remove(name: string, opts?: Cookies.CookieAttributes) {
    Cookies.remove(name, opts)
  }
}
