import CryptoJS from 'crypto-js'
import { uid } from '../core/utils'

const DEFAULT_KEY = 'hyde_default_key'

export const encryption = {
  encrypt(text: string, key = DEFAULT_KEY) {
    return CryptoJS.AES.encrypt(text, key).toString()
  },
  decrypt(cipherText: string, key = DEFAULT_KEY) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, key)
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch (e) {
      return ''
    }
  },
  encryptObject(obj: any, key = DEFAULT_KEY) {
    return this.encrypt(JSON.stringify(obj), key)
  },
  decryptObject(cipher: string, key = DEFAULT_KEY) {
    const s = this.decrypt(cipher, key)
    try {
      return JSON.parse(s)
    } catch (e) {
      return null
    }
  },
  deriveKey(seed: string, salt = '') {
    const key = CryptoJS.PBKDF2(seed, salt || uid(), { keySize: 256 / 32, iterations: 1000 }).toString()
    return key
  }
}
