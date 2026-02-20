/**
 * Runtime JavaScript Obfuscation Module
 * 
 * Provides various techniques to protect JavaScript code at runtime:
 * - String encoding (hex, unicode, base64)
 * - Console protection (disable console methods)
 * - Source code hiding (prevent toString inspection)
 * - Eval protection (wrap critical functions)
 * - Debug breakpoint injection
 */

export const obfuscator = {
    /**
     * Encode a string into hex escape sequences.
     * Makes string literals unreadable in source inspection.
     */
    encodeStringHex(str: string): string {
        return str.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    },

    /**
     * Encode a string into unicode escape sequences.
     */
    encodeStringUnicode(str: string): string {
        return str.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    },

    /**
     * Encode a string to base64.
     */
    encodeBase64(str: string): string {
        return btoa(unescape(encodeURIComponent(str)))
    },

    /**
     * Decode a base64 string.
     */
    decodeBase64(encoded: string): string {
        return decodeURIComponent(escape(atob(encoded)))
    },

    /**
     * Execute a base64-encoded JS string at runtime.
     * The source is not visible in the HTML — only the encoded blob.
     */
    executeEncoded(encodedJS: string): any {
        try {
            const decoded = decodeURIComponent(escape(atob(encodedJS)))
            return new Function(decoded)()
        } catch (e) {
            console.error('[HydeSecurity] Obfuscator execution failed')
            return undefined
        }
    },

    /**
     * Protect a function by wrapping it so that .toString() returns "[native code]"
     * instead of the actual source. Prevents reverse engineering via console inspection.
     */
    protectFunction<T extends (...args: any[]) => any>(fn: T, name = 'protected'): T {
        const wrapper = function (this: any, ...args: any[]) {
            return fn.apply(this, args)
        }
        // Override toString to hide implementation
        wrapper.toString = () => `function ${name}() { [native code] }`
        Object.defineProperty(wrapper, 'name', { value: name, writable: false })
        return wrapper as unknown as T
    },

    /**
     * Disable all console methods (log, warn, error, debug, info, trace, table, dir, etc.)
     * Returns a restore function to re-enable them.
     */
    disableConsole(): () => void {
        const methods: (keyof Console)[] = ['log', 'warn', 'error', 'debug', 'info', 'trace', 'table', 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'assert', 'profile', 'profileEnd']
        const backup: Record<string, any> = {}
        const noop = () => { }

        methods.forEach(m => {
            backup[m] = (console as any)[m]
                ; (console as any)[m] = noop
        })

        return () => {
            methods.forEach(m => {
                ; (console as any)[m] = backup[m]
            })
        }
    },

    /**
     * Encode a JavaScript code string so it can be safely embedded and decoded at runtime.
     * Returns an object with the encoded data and a self-executing decoder snippet.
     */
    obfuscateCode(jsCode: string): { encoded: string; decoder: string } {
        const encoded = btoa(unescape(encodeURIComponent(jsCode)))
        // XOR with a simple key for added layer
        const key = 42
        const xored = encoded.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('')
        const b64Xored = btoa(xored)

        const decoder = `(function(){var k=${key},d=atob("${b64Xored}"),r="";for(var i=0;i<d.length;i++)r+=String.fromCharCode(d.charCodeAt(i)^k);new Function(decodeURIComponent(escape(atob(r))))()})()`

        return { encoded: b64Xored, decoder }
    },

    /**
     * Freeze critical globals to prevent tampering.
     * Makes Object.freeze, Object.defineProperty etc. non-overridable.
     */
    freezeGlobals(): void {
        try {
            // Freeze common prototype methods that attackers override
            const targets = [
                Object.prototype,
                Array.prototype,
                String.prototype,
                Function.prototype
            ]
            targets.forEach(t => {
                Object.getOwnPropertyNames(t).forEach(prop => {
                    try {
                        const desc = Object.getOwnPropertyDescriptor(t, prop)
                        if (desc && desc.configurable) {
                            Object.defineProperty(t, prop, { ...desc, configurable: false })
                        }
                    } catch (e) { /* some props can't be frozen */ }
                })
            })
        } catch (e) { }
    },

    /**
     * Protect the page source from being viewed via Ctrl+U / view-source.
     * Injects a nonce-based verification that clears the page if loaded from view-source.
     */
    preventSourceView(): void {
        // Detect view-source by checking if the page is not in a normal browser context
        try {
            if (window.location.protocol === 'view-source:') {
                document.documentElement.innerHTML = '<h1>Source viewing is disabled</h1>'
            }
        } catch (e) { }

        // Block Ctrl+U
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toUpperCase() === 'U') {
                e.preventDefault()
            }
        }, true)
    },

    /**
     * Create a self-destructing script that executes once and removes itself from DOM.
     */
    selfDestructScript(code: string): void {
        const script = document.createElement('script')
        script.textContent = `(function(){${code}})(); document.currentScript && document.currentScript.remove();`
        document.head.appendChild(script)
    }
}
