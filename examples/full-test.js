
    // ============================
    // IMPORT THE REAL LIBRARY
    // ============================
    import HydeSecurity from '/src/index.ts';

    // Make accessible globally for onclick handlers
    window.HS = HydeSecurity;

    // Initialize
    HydeSecurity.init({
      appName: 'HydeTestSuite',
      mode: 'dev',
      enableLogs: true,
      onThreatDetected: (ev) => {
        console.warn('[Threat]', ev);
        showToast(`Threat: ${ev.type} (${ev.severity})`, true);
      }
    });

    // ============================
    // UTILITIES
    // ============================
    const el = (id) => document.getElementById(id);
    const log = (id, msg, type = 'info') => {
      const box = document.getElementById(`log-${id}`);
      if (!box) return;
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const color = type === 'error' ? '#ef4444' : (type === 'success' ? '#22c55e' : '#7b8fa6');
      box.innerHTML = `<div class="log-entry"><span class="ts">${time}</span> <span style="color:${color}">${msg}</span></div>` + box.innerHTML;
    };
    window._log = log;

    const showToast = (msg, isAlert = false) => {
      const c = el('toasts');
      const d = document.createElement('div');
      d.className = `toast ${isAlert ? 'alert' : ''}`;
      d.innerHTML = `<span>${isAlert ? '⚠️' : '🛡️'}</span> ${msg}`;
      c.appendChild(d);
      setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity 0.3s'; setTimeout(() => d.remove(), 300); }, 3000);
    };
    window.showToast = showToast;

    window.clearAllLogs = () => {
      document.querySelectorAll('.log').forEach(e => e.innerHTML = '');
      console.clear();
    };

    // ============================
    // FEATURE CARDS
    // ============================
    const features = [

      // ─── 1. XSS Sanitization ───
      {
        id: 'xss', title: 'XSS Sanitization', cat: 'Core', badge: 'badge-core',
        desc: 'Strips malicious scripts and event handlers from HTML using DOMPurify.',
        render: () => `
          <div class="demo-box">
            <span class="demo-label">Malicious Input</span>
            <textarea id="xss-input" rows="2"></textarea>
          </div>
          <button onclick="runXSS()">Sanitize</button>
          <div class="demo-box"><span class="demo-label">Safe Output</span>
            <div id="xss-output" class="code-out">// Output will appear here</div>
          </div>
        `,
        action: () => {
          // Set the default malicious input via JS to avoid HTML parser issues with script tags
          el('xss-input').value = '<img src=x onerror=alert(\'Hacked!\')>' + '<scr' + 'ipt>steal(cookies)</' + 'scr' + 'ipt>';
          window.runXSS = () => {
            const val = el('xss-input').value;
            const safe = HS.safeHTML(val);
            el('xss-output').textContent = safe;
            if (val !== safe) {
              log('xss', `Cleaned: removed ${val.length - safe.length} chars of malicious content`, 'success');
              showToast('XSS Attack Blocked!', true);
            } else {
              log('xss', 'Input was already safe', 'info');
            }
          };
        }
      },

      // ─── 2. Encryption ───
      {
        id: 'encryption', title: 'AES Encryption', cat: 'Data', badge: 'badge-data',
        desc: 'Encrypt & decrypt text using AES-256 via CryptoJS.',
        render: () => `
          <input id="enc-key" placeholder="Encryption key (optional)" value="my-secret-key">
          <input id="enc-input" placeholder="Enter sensitive data..." value="Secret API Key: sk-12345">
          <div class="btn-row" style="margin-top:6px">
            <button onclick="doEncrypt()" style="flex:1">🔒 Encrypt</button>
            <button onclick="doDecrypt()" class="btn-ghost" style="flex:1">🔓 Decrypt</button>
          </div>
          <div id="enc-res" class="code-out" style="margin-top:8px">// Result appears here</div>
        `,
        action: () => {
          let lastCipher = '';
          window.doEncrypt = async () => {
            const raw = el('enc-input').value;
            const key = el('enc-key').value;
            if (!key) return log('encryption', 'v2 needs a key — enter a passphrase', 'error');
            lastCipher = await HS.encryptText(raw, key);
            el('enc-res').textContent = lastCipher;
            el('enc-res').style.color = '#22c55e';
            log('encryption', `Encrypted ${raw.length} chars → ${lastCipher.length} chars cipher`, 'success');
          };
          window.doDecrypt = async () => {
            if (!lastCipher) return log('encryption', 'Encrypt something first!', 'error');
            const key = el('enc-key').value;
            const plain = key ? await HS.decryptText(lastCipher, key) : null;
            el('enc-res').textContent = plain || '[Decryption failed — wrong key?]';
            el('enc-res').style.color = plain ? '#dbe8f5' : '#ef4444';
            log('encryption', plain ? 'Decrypted successfully' : 'Decryption failed', plain ? 'success' : 'error');
          };
        }
      },

      // ─── 3. Password Strength ───
      {
        id: 'password', title: 'Password Auditing', cat: 'Auth', badge: 'badge-auth',
        desc: 'Real-time entropy analysis using zxcvbn + validation rules.',
        render: () => `
          <input type="password" id="pwd-input" placeholder="Type a password...">
          <div class="pwd-bar-track"><div id="pwd-bar" class="pwd-bar-fill"></div></div>
          <div class="pwd-info">
            <span id="pwd-label">Strength: —</span>
            <span id="pwd-crack">Crack time: —</span>
          </div>
          <div id="pwd-feedback" style="font-size:10px; color:var(--muted); margin-top:4px;"></div>
          <div id="pwd-rules" style="font-size:10px; margin-top:4px;"></div>
        `,
        action: () => {
          el('pwd-input').addEventListener('input', (e) => {
            const val = e.target.value;
            if (!val) {
              el('pwd-bar').style.width = '0%';
              el('pwd-label').textContent = 'Strength: —';
              el('pwd-crack').textContent = 'Crack time: —';
              el('pwd-feedback').innerHTML = '';
              el('pwd-rules').innerHTML = '';
              return;
            }
            const result = HS.checkPassword(val);
            const bar = el('pwd-bar');
            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
            bar.style.width = result.percent + '%';
            bar.style.background = colors[result.score];
            el('pwd-label').textContent = `Strength: ${result.label}`;
            el('pwd-label').style.color = colors[result.score];
            el('pwd-crack').textContent = `Crack time: ${result.crackTime}`;

            // Validation rules
            const v = HS.modules.passwordStrength.validate(val);
            if (v.errors.length > 0) {
              el('pwd-rules').innerHTML = v.errors.map(e => `<span style="color:#ef4444">✗ ${e}</span>`).join('<br>');
            } else {
              el('pwd-rules').innerHTML = '<span style="color:#22c55e">✓ All rules passed</span>';
            }

            // Feedback
            const tips = HS.modules.passwordStrength.generateSuggestions(val);
            el('pwd-feedback').innerHTML = tips.length > 0 ? '💡 ' + tips.slice(0, 3).join(' • ') : '';

            log('password', `Score: ${result.score}/4 — ${result.label}`, result.score >= 3 ? 'success' : 'info');
          });
        }
      },

      // ─── 4. Content Protection ───
      {
        id: 'anti-copy', title: 'Content Protection', cat: 'Anti-Tamper', badge: 'badge-tamper',
        desc: 'Blocks copy, cut, drag, and optionally disables text selection.',
        render: () => `
          <div class="demo-box" id="copy-zone" style="user-select:auto">
            <span class="demo-label">Protected Zone</span>
            <p style="margin:4px 0; font-size:12px;">Try to select and copy this text. Toggle the protection to enable/disable.</p>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button id="btn-copy-on" onclick="enableCopy()">Enable Protection</button>
            <button id="btn-copy-off" class="btn-ghost" onclick="disableCopy()">Disable Protection</button>
          </div>
        `,
        action: () => {
          window.enableCopy = () => {
            HS.modules.antiCopy.enable({
              disableSelection: true,
              onThreat: (ev) => log('anti-copy', `Blocked: ${ev.type}`, 'error')
            });
            log('anti-copy', 'Content protection ENABLED', 'success');
            showToast('Copy protection enabled');
          };
          window.disableCopy = () => {
            HS.modules.antiCopy.disable();
            log('anti-copy', 'Content protection DISABLED', 'info');
          };
        }
      },

      // ─── 5. Context Menu ───
      {
        id: 'ctx-menu', title: 'Context Menu Block', cat: 'Anti-Tamper', badge: 'badge-tamper',
        desc: 'Prevents the browser right-click context menu.',
        render: () => `
          <div class="demo-box">
            <span class="demo-label">Right-Click Here</span>
            <p style="margin:4px 0; font-size:12px;">Try right-clicking anywhere on the page after enabling.</p>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="enableCtx()">Block Context Menu</button>
            <button class="btn-ghost" onclick="disableCtx()">Allow Context Menu</button>
          </div>
        `,
        action: () => {
          window.enableCtx = () => {
            HS.modules.antiContextMenu.enable({
              onThreat: (ev) => log('ctx-menu', 'Right-click blocked!', 'error')
            });
            log('ctx-menu', 'Context menu blocking ENABLED', 'success');
          };
          window.disableCtx = () => {
            HS.modules.antiContextMenu.disable();
            log('ctx-menu', 'Context menu blocking DISABLED', 'info');
          };
        }
      },

      // ─── 6. Bot Detection ───
      {
        id: 'bot', title: 'Bot & Automation Detection', cat: 'Detection', badge: 'badge-detect',
        desc: 'Detects headless browsers, fast typing, and paste events.',
        render: () => `
          <div class="demo-box">
            <span class="demo-label">Typing Test</span>
            <input id="bot-input" placeholder="Type here naturally...">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:6px">
            <span id="bot-status" style="font-size:11px">Status: Waiting...</span>
            <div class="btn-row">
              <button class="btn-ghost" onclick="simBot()">Simulate Bot Paste</button>
              <button class="btn-ghost" onclick="checkHeadless()">Check Headless</button>
            </div>
          </div>
        `,
        action: () => {
          const inp = el('bot-input');
          const tracker = HS.modules.antiBot.detectFastTyping(inp, 30);
          HS.modules.antiBot.detectPaste(inp, (e) => {
            el('bot-status').innerHTML = 'Status: <span style="color:#ef4444">🤖 PASTE DETECTED</span>';
            log('bot', 'Paste event detected on input!', 'error');
            inp.style.borderColor = '#ef4444';
          });

          inp.addEventListener('keyup', () => {
            const stats = tracker.getStats();
            if (tracker.isBot()) {
              el('bot-status').innerHTML = `Status: <span style="color:#ef4444">🤖 BOT (${stats.fast}/${stats.total} fast)</span>`;
              inp.style.borderColor = '#ef4444';
              log('bot', `Superhuman typing: ${stats.fast}/${stats.total} keystrokes too fast`, 'error');
            } else {
              el('bot-status').innerHTML = `Status: <span style="color:#22c55e">👤 Human (${stats.total} keys)</span>`;
              inp.style.borderColor = '';
            }
          });

          window.simBot = () => {
            inp.value = 'AutomatedBotInput12345';
            inp.dispatchEvent(new Event('paste', { bubbles: true }));
            log('bot', 'Bot paste simulation triggered', 'error');
            el('bot-status').innerHTML = 'Status: <span style="color:#ef4444">🤖 BOT DETECTED</span>';
            inp.style.borderColor = '#ef4444';
          };
          window.checkHeadless = () => {
            const result = HS.modules.antiBot.detectHeadless();
            if (result.isBot) {
              log('bot', `Headless DETECTED — signals: ${result.signals.join(', ')}`, 'error');
              showToast('Headless browser detected!', true);
            } else {
              log('bot', `No headless signals (${result.signals.length} weak signals)`, 'success');
            }
          };
        }
      },

      // ─── 7. Watermark ───
      {
        id: 'watermark', title: 'Dynamic Watermark', cat: 'Traceability', badge: 'badge-info',
        desc: 'Injects visible or invisible watermarks for leak tracing.',
        render: () => `
          <div class="demo-box" id="wm-canvas" style="height:60px; position:relative; overflow:hidden;">
            <span class="demo-label">Document Body</span>
            <div style="z-index:1; position:relative;">Confidential Document Content...</div>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="addWM()">Add Watermark</button>
            <button class="btn-ghost" onclick="removeWM()">Remove Watermark</button>
          </div>
        `,
        action: () => {
          let removeHandle = null;
          window.addWM = () => {
            removeHandle = HS.modules.watermark.addWatermark(`TestUser_${Date.now()}`);
            log('watermark', 'Page watermark injected', 'success');
            // Also add visual watermark inside canvas
            const cvs = el('wm-canvas');
            let overlay = cvs.querySelector('.wm-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.className = 'wm-overlay';
              overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform:rotate(-10deg);color:rgba(255,255,255,0.08);font-size:13px;pointer-events:none;font-weight:bold;';
              overlay.textContent = `USER_${Math.floor(Math.random() * 9999)} | ${new Date().toISOString().split('T')[0]}`;
              cvs.appendChild(overlay);
            }
          };
          window.removeWM = () => {
            if (removeHandle) { removeHandle(); removeHandle = null; }
            const overlay = el('wm-canvas').querySelector('.wm-overlay');
            if (overlay) overlay.remove();
            log('watermark', 'Watermark removed', 'info');
          };
        }
      },

      // ─── 8. Anti-DevTools ───
      {
        id: 'devtools', title: 'Anti-DevTools', cat: 'Detection', badge: 'badge-detect',
        desc: 'Detects DevTools via window size delta and debugger traps.',
        render: () => `
          <p class="desc" style="color:#f59e0b">⚠️ Enabling in strict mode may trigger debugger pauses.</p>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="enableDT()">Enable Detection</button>
            <button class="btn-ghost" onclick="disableDT()">Disable</button>
            <button class="btn-warn" onclick="lockScr()">Lock Screen</button>
            <button class="btn-ghost" onclick="unlockScr()">Unlock</button>
          </div>
        `,
        action: () => {
          window.enableDT = () => {
            HS.modules.antiDevtools.enable({
              onThreat: (ev) => log('devtools', `Threat: ${ev.type}`, 'error')
            });
            log('devtools', 'DevTools detection ENABLED', 'success');
          };
          window.disableDT = () => {
            HS.modules.antiDevtools.disable();
            log('devtools', 'DevTools detection DISABLED', 'info');
          };
          window.lockScr = () => {
            HS.lockScreen('⚠️ Security Lock — DevTools detected');
            log('devtools', 'Screen LOCKED', 'error');
          };
          window.unlockScr = () => {
            HS.unlockScreen();
            log('devtools', 'Screen UNLOCKED', 'success');
          };
        }
      },

      // ─── 9. Anti-Debug ───
      {
        id: 'debug', title: 'Anti-Debug', cat: 'Detection', badge: 'badge-detect',
        desc: 'Timing traps to detect debugger breakpoint pauses.',
        render: () => `
          <p class="desc">Starts a timing loop — if a debugger pauses execution, the delta spike is detected.</p>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="enableAD()">Enable Timing Trap</button>
            <button class="btn-ghost" onclick="disableAD()">Disable</button>
          </div>
        `,
        action: () => {
          window.enableAD = () => {
            HS.modules.antiDebug.enable({
              onThreat: (ev) => {
                log('debug', `Debugger detected! Delta: ${ev.details?.delta?.toFixed(0)}ms`, 'error');
                showToast('Debugger timing trap triggered!', true);
              }
            });
            log('debug', 'Anti-debug timing trap ENABLED', 'success');
          };
          window.disableAD = () => {
            HS.modules.antiDebug.disable();
            log('debug', 'Anti-debug DISABLED', 'info');
          };
        }
      },

      // ─── 10. Anti-Print ───
      {
        id: 'print', title: 'Anti-Print', cat: 'Anti-Tamper', badge: 'badge-tamper',
        desc: 'Blurs page content when print dialog is triggered.',
        render: () => `
          <p class="desc">Enable, then press Ctrl+P to see the page blur.</p>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="enablePrint()">Enable Anti-Print</button>
            <button class="btn-ghost" onclick="disablePrint()">Disable</button>
            <button class="btn-ghost" onclick="window.print()">Test Print</button>
          </div>
        `,
        action: () => {
          window.enablePrint = () => {
            HS.modules.antiPrint.enable({
              onThreat: (ev) => log('print', 'Print attempt detected & blurred!', 'error')
            });
            log('print', 'Anti-print ENABLED', 'success');
          };
          window.disablePrint = () => {
            HS.modules.antiPrint.disable();
            log('print', 'Anti-print DISABLED', 'info');
          };
        }
      },

      // ─── 11. Anti-Iframe ───
      {
        id: 'iframe', title: 'Anti-Iframe', cat: 'Detection', badge: 'badge-detect',
        desc: 'Detects if page is loaded inside an unauthorized iframe.',
        render: () => `
          <p class="desc">Checks if <code>window.self !== window.top</code> and reports.</p>
          <button onclick="checkIframe()" style="margin-top:6px">Check Iframe Status</button>
          <div id="iframe-result" class="code-out" style="margin-top:8px">// Click to check</div>
        `,
        action: () => {
          window.checkIframe = () => {
            try {
              const inIframe = window.self !== window.top;
              el('iframe-result').textContent = inIframe ? '⚠️ Running inside an iframe!' : '✅ Running as top-level window';
              el('iframe-result').style.color = inIframe ? '#ef4444' : '#22c55e';
              log('iframe', inIframe ? 'Iframe detected!' : 'Not in iframe — safe', inIframe ? 'error' : 'success');
            } catch (e) {
              el('iframe-result').textContent = '⚠️ Cross-origin iframe detected (access blocked)';
              log('iframe', 'Cross-origin iframe detection blocked', 'error');
            }
          };
        }
      },

      // ─── 12. Secure Storage ───
      {
        id: 'storage', title: 'Secure Storage', cat: 'Data', badge: 'badge-data',
        desc: 'Encrypted localStorage with localforage fallback.',
        render: () => `
          <input id="st-key" placeholder="Key" value="test-key" style="margin-bottom:4px">
          <input id="st-val" placeholder="Value" value="Hello Secure World!">
          <div class="btn-row" style="margin-top:6px">
            <button onclick="stSet()">Set</button>
            <button onclick="stSetEnc()">Set (Encrypted)</button>
            <button class="btn-ghost" onclick="stGet()">Get</button>
            <button class="btn-ghost" onclick="stGetDec()">Get (Decrypt)</button>
            <button class="btn-danger" onclick="stClear()">Clear All</button>
          </div>
          <div id="st-result" class="code-out" style="margin-top:8px">// Result</div>
        `,
        action: () => {
          window.stSet = () => {
            HS.modules.storage.set(el('st-key').value, el('st-val').value);
            log('storage', `Set "${el('st-key').value}" = "${el('st-val').value}"`, 'success');
          };
          window.stSetEnc = async () => {
            await HS.modules.storage.setEncrypted(el('st-key').value, el('st-val').value, { key: 'example-passphrase' });
            log('storage', `Set "${el('st-key').value}" (encrypted)`, 'success');
          };
          window.stGet = () => {
            const v = HS.modules.storage.get(el('st-key').value);
            el('st-result').textContent = v !== null ? String(v) : 'null (not found)';
            el('st-result').style.color = v !== null ? '#22c55e' : '#ef4444';
            log('storage', `Get "${el('st-key').value}" → ${v !== null ? String(v).substring(0, 50) : 'null'}`, v !== null ? 'success' : 'error');
          };
          window.stGetDec = async () => {
            const v = await HS.modules.storage.getEncrypted(el('st-key').value, { key: 'example-passphrase' });
            el('st-result').textContent = v || 'null (not found or decryption failed)';
            el('st-result').style.color = v ? '#22c55e' : '#ef4444';
            log('storage', `Get+Decrypt "${el('st-key').value}" → ${v || 'null'}`, v ? 'success' : 'error');
          };
          window.stClear = () => {
            HS.modules.storage.clear();
            el('st-result').textContent = 'Storage cleared';
            log('storage', 'All storage cleared', 'info');
          };
        }
      },

      // ─── 13. Cookie Manager ───
      {
        id: 'cookie', title: 'Cookie Management', cat: 'Data', badge: 'badge-data',
        desc: 'Secure cookie operations with SameSite and expiry.',
        render: () => `
          <input id="ck-name" placeholder="Cookie name" value="hyde_test" style="margin-bottom:4px">
          <input id="ck-value" placeholder="Cookie value" value="secure_value_123">
          <div class="btn-row" style="margin-top:6px">
            <button onclick="ckSet()">Set Cookie</button>
            <button class="btn-ghost" onclick="ckGet()">Get Cookie</button>
            <button class="btn-danger" onclick="ckRemove()">Remove</button>
          </div>
          <div id="ck-result" class="code-out" style="margin-top:8px">// Result</div>
        `,
        action: () => {
          window.ckSet = () => {
            HS.modules.cookie.set(el('ck-name').value, el('ck-value').value, 7);
            log('cookie', `Cookie "${el('ck-name').value}" set for 7 days`, 'success');
          };
          window.ckGet = () => {
            const v = HS.modules.cookie.get(el('ck-name').value);
            el('ck-result').textContent = v !== null ? v : 'null (not found)';
            log('cookie', `Cookie "${el('ck-name').value}" = ${v || 'not found'}`, v ? 'success' : 'info');
          };
          window.ckRemove = () => {
            HS.modules.cookie.remove(el('ck-name').value);
            el('ck-result').textContent = 'Cookie removed';
            log('cookie', `Cookie "${el('ck-name').value}" removed`, 'info');
          };
        }
      },

      // ─── 14. Session Manager ───
      {
        id: 'session', title: 'Session Manager', cat: 'Auth', badge: 'badge-auth',
        desc: 'Idle timeout detection with multi-tab logout broadcast.',
        render: () => `
          <p class="desc">Starts an idle timer. If no activity for N minutes, session expires and storage clears.</p>
          <input id="sess-timeout" type="number" placeholder="Timeout (minutes)" value="1" style="width:120px">
          <div class="btn-row" style="margin-top:6px">
            <button onclick="sessInit()">Init Session</button>
            <button class="btn-danger" onclick="sessEnd()">End Session</button>
            <button class="btn-ghost" onclick="sessBroadcast()">Broadcast Logout</button>
          </div>
        `,
        action: () => {
          window.sessInit = () => {
            const mins = parseInt(el('sess-timeout').value) || 1;
            HS.modules.session.init({
              timeoutMinutes: mins,
              onExpire: () => {
                log('session', 'SESSION EXPIRED — storage cleared!', 'error');
                showToast('Session expired due to inactivity', true);
              }
            });
            log('session', `Session initialized with ${mins}min timeout`, 'success');
          };
          window.sessEnd = () => {
            HS.modules.session.end();
            log('session', 'Session ended — logout broadcast sent', 'info');
          };
          window.sessBroadcast = () => {
            HS.modules.session.broadcast('logout');
            log('session', 'Broadcast "logout" sent to other tabs', 'info');
          };
        }
      },

      // ─── 15. Rate Limiter ───
      {
        id: 'rate', title: 'Rate Limiter', cat: 'Core', badge: 'badge-core',
        desc: 'Throttle function calls to prevent rapid-fire abuse.',
        render: () => `
          <p class="desc">Click the button rapidly — only one call per 1000ms will go through.</p>
          <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
            <button id="rate-btn" onclick="rateClick()">Click Me Rapidly</button>
            <span id="rate-count" style="font-size:12px; color:var(--muted)">Calls: 0</span>
          </div>
        `,
        action: () => {
          let count = 0;
          const throttledFn = HS.modules.rateLimiter.makeRateLimited(() => {
            count++;
            el('rate-count').textContent = `Calls: ${count}`;
            log('rate', `Call #${count} passed through throttle`, 'success');
          }, 1000);
          window.rateClick = throttledFn;
        }
      },

      // ─── 16. DOM Guard (Self-Healing) ───
      {
        id: 'domguard', title: 'DOM Guard (Self-Healing)', cat: 'Anti-Tamper', badge: 'badge-tamper',
        desc: 'Monitors DOM mutations and instantly reconstructs tampered elements.',
        render: () => `
          <div class="demo-box" id="guarded-el">
            <span class="demo-label">Guarded Element</span>
            <p id="guarded-text" style="font-size:12px; margin:4px 0;">This content is protected. Try deleting it in DevTools!</p>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="guardEnable()">Enable Guard</button>
            <button class="btn-ghost" onclick="guardTamper()">Simulate Tamper</button>
          </div>
        `,
        action: () => {
          let stopGuard = null;
          window.guardEnable = () => {
            stopGuard = HS.modules.domGuard.protect('#guarded-el', () => {
              log('domguard', 'TAMPER DETECTED — DOM was modified! Reverting...', 'error');
              showToast('DOM Tamper Alert - Self Healing!', true);
            }, true); // Enable self-healing
            log('domguard', 'Self-Healing DOM Guard ENABLED on #guarded-el', 'success');
          };
          window.guardTamper = () => {
            const text = el('guarded-text');
            if(text) {
              text.textContent = '🚨 TAMPERED CONTENT — ' + Date.now();
              text.style.color = '#ef4444';
            } else {
              el('guarded-el').remove();
            }
            log('domguard', 'Manual tamper simulation triggered', 'info');
          };
        }
      },

      // ─── 17. Device Detection ───
      {
        id: 'device', title: 'Device Detection', cat: 'Info', badge: 'badge-info',
        desc: 'Identifies browser, OS, platform, and engine using Bowser.',
        render: () => `
          <button onclick="detectDev()">Detect Device</button>
          <dl id="dev-info" class="info-grid" style="margin-top:8px"></dl>
        `,
        action: () => {
          window.detectDev = () => {
            const info = HS.modules.device.detectDevice();
            const dl = el('dev-info');
            const b = info.browser || {};
            const os = info.os || {};
            const p = info.platform || {};
            const e = info.engine || {};
            dl.innerHTML = `
              <dt>Browser</dt><dd>${b.name || '?'} ${b.version || ''}</dd>
              <dt>OS</dt><dd>${os.name || '?'} ${os.version || ''}</dd>
              <dt>Platform</dt><dd>${p.type || '?'} ${p.vendor || ''} ${p.model || ''}</dd>
              <dt>Engine</dt><dd>${e.name || '?'} ${e.version || ''}</dd>
            `;
            log('device', `${b.name} ${b.version} on ${os.name} ${os.version}`, 'success');
          };
        }
      },

      // ─── 18. Fingerprint ───
      {
        id: 'fingerprint', title: 'Browser Fingerprint', cat: 'Info', badge: 'badge-info',
        desc: 'Generates a unique visitor ID using FingerprintJS.',
        render: () => `
          <button onclick="getFP()">Generate Fingerprint</button>
          <div id="fp-result" class="code-out" style="margin-top:8px">// Click to generate</div>
        `,
        action: () => {
          window.getFP = async () => {
            el('fp-result').textContent = 'Generating...';
            try {
              const fp = await HS.modules.fingerprint.getFingerprint();
              el('fp-result').textContent = fp;
              el('fp-result').style.color = '#22c55e';
              log('fingerprint', `Visitor ID: ${fp}`, 'success');
            } catch (e) {
              el('fp-result').textContent = 'Error: ' + e.message;
              el('fp-result').style.color = '#ef4444';
              log('fingerprint', 'Fingerprint generation failed: ' + e.message, 'error');
            }
          };
        }
      },

      // ─── 19. Form Protection ───
      {
        id: 'forms', title: 'Form Protection', cat: 'Core', badge: 'badge-core',
        desc: 'Auto-sanitizes form inputs on submit + hidden honeypot field.',
        render: () => `
          <form id="test-form" onsubmit="return testForm(event)">
            <input id="form-input" placeholder="Enter HTML to test sanitization..." style="margin-bottom:4px">
            <div class="btn-row">
              <button type="submit">Submit (Sanitized)</button>
              <button type="button" class="btn-ghost" onclick="addHP()">Add Honeypot</button>
            </div>
          </form>
          <div id="form-result" class="code-out" style="margin-top:8px">// Submit to see sanitized value</div>
        `,
        action: () => {
          const form = el('test-form');
          // Set example XSS input via JS to avoid HTML parser issues with script tags
          el('form-input').value = '<img src=x onerror=alert(1)>';
          HS.modules.forms.attachSanitize(form);
          log('forms', 'Form auto-sanitization attached', 'success');

          window.testForm = (e) => {
            e.preventDefault();
            el('form-result').textContent = `Sanitized value: "${el('form-input').value}"`;
            log('forms', 'Form submitted — value sanitized', 'success');
            return false;
          };
          window.addHP = () => {
            HS.modules.forms.addHoneypot(form);
            log('forms', 'Honeypot field added to form (hidden)', 'success');
            showToast('Honeypot trap deployed');
          };
        }
      },

      // ─── 20. Router Guard ───
      {
        id: 'router', title: 'Router Guard', cat: 'Core', badge: 'badge-core',
        desc: 'Monitors pushState/popstate for unauthorized navigation.',
        render: () => `
          <p class="desc">Intercepts <code>history.pushState</code> and popstate events.</p>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="enableRouter()">Enable Guard</button>
            <button class="btn-ghost" onclick="testPush()">Simulate pushState</button>
            <button class="btn-ghost" onclick="disableRouter()">Disable</button>
          </div>
          <div id="router-result" class="code-out" style="margin-top:8px">// Navigation events appear here</div>
        `,
        action: () => {
          let stopRouter = null;
          window.enableRouter = () => {
            stopRouter = HS.modules.routerGuard.protectHistory((loc) => {
              el('router-result').textContent = `Navigation: ${loc.pathname}${loc.search}${loc.hash}`;
              log('router', `Route change: ${loc.pathname}`, 'info');
            });
            log('router', 'Router guard ENABLED', 'success');
          };
          window.testPush = () => {
            const path = '/test-route-' + Math.floor(Math.random() * 100);
            history.pushState({}, '', path);
            log('router', `Pushed: ${path}`, 'info');
          };
          window.disableRouter = () => {
            if (stopRouter) { stopRouter(); stopRouter = null; }
            history.pushState({}, '', '/examples/full-test.html');
            log('router', 'Router guard DISABLED', 'info');
          };
        }
      },

      // ─── 22. Tab Guard (Privacy Blur) ───
      {
        id: 'tabguard', title: 'Tab Guard — Privacy Blur', cat: 'Privacy', badge: 'badge-privacy',
        desc: 'Blurs the entire page when user switches tabs or windows for confidentiality.',
        render: () => `
          <div class="btn-row">
            <button onclick="enableTabGuard()">Enable Tab Guard</button>
            <button class="btn-ghost" onclick="disableTabGuard()">Disable</button>
            <button class="btn-ghost" onclick="checkTabStatus()">Check Status</button>
          </div>
          <div id="tab-result" class="code-out" style="margin-top:8px">// Switch tabs to see the privacy blur</div>
        `,
        action: () => {
          window.enableTabGuard = () => {
            HS.modules.tabGuard.enable({
              blurOnWindowBlur: true,
              onThreat: (ev) => {
                log('tabguard', 'Event: ' + ev.type, ev.type === 'tab_hidden' ? 'error' : 'success');
              }
            });
            log('tabguard', 'Tab Guard ENABLED — try switching tabs!', 'success');
            el('tab-result').textContent = '🛡️ Active — switch to another tab to test';
            el('tab-result').style.color = '#22c55e';
          };
          window.disableTabGuard = () => {
            HS.modules.tabGuard.disable();
            log('tabguard', 'Tab Guard DISABLED', 'info');
            el('tab-result').textContent = 'Disabled';
            el('tab-result').style.color = '#7b8fa6';
          };
          window.checkTabStatus = () => {
            const s = HS.modules.tabGuard.getStatus();
            el('tab-result').textContent = JSON.stringify(s);
            log('tabguard', `Status — enabled: ${s.enabled}, hidden: ${s.hidden}`, 'info');
          };
        }
      },

      // ─── 23. JS Obfuscator ───
      {
        id: 'obfuscator', title: 'JS Obfuscator', cat: 'Core', badge: 'badge-core',
        desc: 'Runtime JS obfuscation: string encoding, function protection, console disable.',
        render: () => `
          <input id="obf-input" placeholder="Enter text to encode..." value="alert('HydeSecurity!')" style="margin-bottom:4px">
          <div class="btn-row">
            <button onclick="obfHex()">Hex Encode</button>
            <button onclick="obfUnicode()">Unicode</button>
            <button onclick="obfBase64()">Base64</button>
            <button class="btn-ghost" onclick="obfObfuscate()">Full Obfuscate</button>
          </div>
          <div class="btn-row" style="margin-top:4px">
            <button class="btn-warn" onclick="obfDisableConsole()">Disable Console</button>
            <button class="btn-success" onclick="obfRestoreConsole()">Restore Console</button>
            <button class="btn-ghost" onclick="obfProtectFn()">Protect Function</button>
          </div>
          <div id="obf-result" class="code-out" style="margin-top:8px;word-break:break-all">// Encoded output</div>
        `,
        action: () => {
          let restoreConsole = null;
          window.obfHex = () => {
            const v = el('obf-input').value;
            const r = HS.modules.obfuscator.encodeStringHex(v);
            el('obf-result').textContent = 'Hex: ' + r;
            log('obfuscator', 'Hex encoded (' + r.length + ' chars)', 'success');
          };
          window.obfUnicode = () => {
            const v = el('obf-input').value;
            const r = HS.modules.obfuscator.encodeStringUnicode(v);
            el('obf-result').textContent = 'Unicode: ' + r;
            log('obfuscator', 'Unicode encoded', 'success');
          };
          window.obfBase64 = () => {
            const v = el('obf-input').value;
            const r = HS.modules.obfuscator.encodeBase64(v);
            el('obf-result').textContent = 'Base64: ' + r + '\nDecoded: ' + HS.modules.obfuscator.decodeBase64(r);
            log('obfuscator', 'Base64: ' + r, 'success');
          };
          window.obfObfuscate = () => {
            const v = el('obf-input').value;
            const r = HS.modules.obfuscator.obfuscateCode(v);
            el('obf-result').textContent = 'Decoder snippet:\n' + r.decoder.substring(0, 200) + '...';
            log('obfuscator', 'Code obfuscated with XOR + Base64', 'success');
          };
          window.obfDisableConsole = () => {
            restoreConsole = HS.modules.obfuscator.disableConsole();
            el('obf-result').textContent = '🔇 Console methods disabled — open DevTools to verify';
            log('obfuscator', 'Console disabled', 'error');
          };
          window.obfRestoreConsole = () => {
            if (restoreConsole) { restoreConsole(); restoreConsole = null; }
            el('obf-result').textContent = '🔊 Console restored';
            log('obfuscator', 'Console restored', 'success');
          };
          window.obfProtectFn = () => {
            const secret = (x) => x * 42;
            const protected_ = HS.modules.obfuscator.protectFunction(secret, 'mySecretFn');
            el('obf-result').textContent = 'protected.toString() = "' + protected_.toString() + '"\nResult: protected(10) = ' + protected_(10);
            log('obfuscator', 'Function protected — toString shows [native code]', 'success');
          };
        }
      },

      // ─── 24. Anti-Screenshot ───
      {
        id: 'screenshot', title: 'Anti-Screenshot', cat: 'Privacy', badge: 'badge-privacy',
        desc: 'Blocks screen capture via CSS tricks, PrintScreen detection, and capture API monitoring.',
        render: () => `
          <div class="btn-row">
            <button onclick="enableAntiSS()">Enable Protection</button>
            <button class="btn-ghost" onclick="disableAntiSS()">Disable</button>
            <button class="btn-ghost" onclick="addWatermarkSS()">Add Canvas Watermark</button>
          </div>
          <div id="ss-result" class="code-out" style="margin-top:8px">// PrintScreen key will trigger flash overlay</div>
        `,
        action: () => {
          let removeWM = null;
          window.enableAntiSS = () => {
            HS.modules.antiScreenCapture.enable({
              onThreat: (ev) => {
                log('screenshot', 'Threat: ' + ev.type, 'error');
              }
            });
            log('screenshot', 'Anti-screenshot ENABLED', 'success');
            el('ss-result').textContent = '🛡️ Active — try PrtScn key';
            el('ss-result').style.color = '#22c55e';
          };
          window.disableAntiSS = () => {
            HS.modules.antiScreenCapture.disable();
            if (removeWM) { removeWM(); removeWM = null; }
            log('screenshot', 'Anti-screenshot DISABLED', 'info');
            el('ss-result').textContent = 'Disabled';
            el('ss-result').style.color = '#7b8fa6';
          };
          window.addWatermarkSS = () => {
            removeWM = HS.modules.antiScreenCapture.addCanvasWatermark('CONFIDENTIAL — ' + new Date().toLocaleDateString());
            log('screenshot', 'Canvas watermark applied', 'success');
            showToast('Watermark layer added');
          };
        }
      },

      // ─── 25. Behavioral Biometrics ───
      {
        id: 'biometrics', title: 'Behavioral Biometrics', cat: 'Detection', badge: 'badge-detect',
        desc: 'Analyzes mouse and keystroke dynamics to score human probability.',
        render: () => `
          <div class="demo-box" id="bio-zone" style="height: 100px; cursor: crosshair;">
            <span class="demo-label">Interaction Zone</span>
            <p style="font-size:11px; margin-top:10px;">Move mouse here and type to generate score.</p>
            <input id="bio-input" placeholder="Type here..." style="margin-top:5px; width: 80%;">
          </div>
          <div style="margin-top:6px; display:flex; justify-content:space-between;">
            <span id="bio-score" style="font-size:12px; font-weight:bold;">Score: --</span>
            <div class="btn-row">
              <button onclick="startBio()">Start Tracking</button>
              <button class="btn-ghost" onclick="stopBio()">Stop</button>
            </div>
          </div>
        `,
        action: () => {
          let tracker = null;
          let interval = null;
          window.startBio = () => {
            tracker = HS.modules.biometrics.startTracking(el('bio-zone'));
            log('biometrics', 'Started tracking biometrics', 'success');
            interval = setInterval(() => {
              const score = tracker.getHumanScore();
              const stats = tracker.getStats();
              el('bio-score').textContent = `Score: ${score}% human`;
              el('bio-score').style.color = score > 50 ? '#22c55e' : '#ef4444';
            }, 1000);
          };
          window.stopBio = () => {
            if(tracker) tracker.stop();
            if(interval) clearInterval(interval);
            log('biometrics', 'Stopped tracking', 'info');
          };
        }
      },

      // ─── 26. Advanced Clickjacking ───
      {
        id: 'clickjack', title: 'Anti-Clickjacking (v2)', cat: 'Anti-Tamper', badge: 'badge-tamper',
        desc: 'Uses IntersectionObserver v2 to detect invisible overlays/iframes.',
        render: () => `
          <div class="demo-box" id="cj-btn-container" style="position:relative; z-index:1;">
            <span class="demo-label">Target</span>
            <button id="cj-target" style="width:100%;">Sensitive Action Button</button>
          </div>
          <div id="cj-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:red; opacity:0; z-index:2; pointer-events:none;"></div>
          <div class="btn-row" style="margin-top:6px; position:relative; z-index:3;">
            <button onclick="enableCJ()">Protect Button</button>
            <button class="btn-ghost" onclick="simCJ()">Simulate Overlay Attack</button>
          </div>
        `,
        action: () => {
          let cleanup = null;
          window.enableCJ = () => {
            cleanup = HS.modules.antiClickjacking.protect('#cj-target', () => {
              log('clickjack', 'OCCLUSION DETECTED: Button is covered!', 'error');
              showToast('Clickjacking attempt blocked!', true);
              el('cj-target').disabled = true;
            });
            log('clickjack', 'Button protected via IO v2', 'success');
          };
          window.simCJ = () => {
            el('cj-overlay').style.opacity = '0.01'; // Almost invisible
            el('cj-overlay').style.pointerEvents = 'auto'; // Block clicks
            log('clickjack', 'Overlay deployed over button', 'info');
            setTimeout(() => {
              el('cj-overlay').style.opacity = '0';
              el('cj-overlay').style.pointerEvents = 'none';
              el('cj-target').disabled = false;
            }, 3000);
          };
        }
      },

      // ─── 27. Zero-Trust Network Firewall ───
      {
        id: 'firewall', title: 'Network Firewall', cat: 'Data', badge: 'badge-data',
        desc: 'Intercepts fetch/XHR to block unauthorized data exfiltration.',
        render: () => `
          <div class="btn-row">
            <button onclick="enableFirewall()">Enable Firewall (Allow 'api.github.com')</button>
            <button class="btn-ghost" onclick="disableFirewall()">Disable</button>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button onclick="testFetch('https://api.github.com/users/tirth1107')">Fetch Github (Allowed)</button>
            <button class="btn-danger" onclick="testFetch('https://evil-hacker.com/steal')">Fetch Evil (Blocked)</button>
          </div>
        `,
        action: () => {
          let disableFw = null;
          window.enableFirewall = () => {
            disableFw = HS.modules.networkFirewall.enable(['api.github.com'], (url) => {
              log('firewall', `BLOCKED request to: ${url}`, 'error');
              showToast('Network Firewall blocked request!', true);
            });
            log('firewall', 'Firewall enabled', 'success');
          };
          window.disableFirewall = () => {
            if(disableFw) disableFw();
            log('firewall', 'Firewall disabled', 'info');
          };
          window.testFetch = async (url) => {
            try {
              log('firewall', `Fetching ${url}...`, 'info');
              await fetch(url);
              log('firewall', `Success: ${url}`, 'success');
            } catch (e) {
              // Ignore the firewall throw
            }
          };
        }
      },

      // ─── 28. Initialization & Config ───
      {
        id: 'config', title: 'Library Init & Config', cat: 'Core', badge: 'badge-core',
        desc: 'Test init modes, toast, and global enable/disable.',
        render: () => `
          <div class="btn-row">
            <button onclick="HS.setMode('dev'); _log('config','Mode → dev','success')">Dev Mode</button>
            <button onclick="HS.setMode('balanced'); _log('config','Mode → balanced','success')">Balanced</button>
            <button onclick="HS.setMode('strict'); _log('config','Mode → strict','success')">Strict</button>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button class="btn-success" onclick="HS.enableAll(); _log('config','All modules ENABLED','success')">Enable All</button>
            <button class="btn-danger" onclick="HS.disableAll(); _log('config','All modules DISABLED','info')">Disable All</button>
            <button class="btn-ghost" onclick="HS.toast('Hello from HydeSecurity!')">Show Toast</button>
          </div>
          <div class="btn-row" style="margin-top:6px">
            <button class="btn-ghost" onclick="runBotDetect()">Run Bot Detection</button>
          </div>
          <div id="config-bot" class="code-out" style="margin-top:8px">// Bot detection result</div>
        `,
        action: () => {
          window.runBotDetect = () => {
            const result = HS.detectBot();
            el('config-bot').textContent = result.isBot
              ? `🤖 Bot detected! Signals: ${result.signals.join(', ')}`
              : `👤 Looks human. Weak signals: ${result.signals.length}`;
            el('config-bot').style.color = result.isBot ? '#ef4444' : '#22c55e';
            log('config', result.isBot ? 'Bot detected' : 'No bot signals', result.isBot ? 'error' : 'success');
          };
        }
      }
    ];

    // ============================
    // RENDER ENGINE
    // ============================
    function renderDashboard() {
      const grid = el('dashboard');
      grid.innerHTML = '';
      features.forEach(f => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="card-head">
            <span class="badge ${f.badge}">${f.cat}</span>
            <h3>${f.title}</h3>
          </div>
          <div class="playground">
            <p class="desc">${f.desc}</p>
            ${f.render()}
            <div class="log" id="log-${f.id}"></div>
          </div>
        `;
        grid.appendChild(card);
        setTimeout(f.action, 0);
      });
    }

    // ============================
    // INIT
    // ============================
    document.addEventListener('DOMContentLoaded', () => {
      renderDashboard();
      showToast('🛡️ HydeSecurity Library Loaded — All modules ready');
      el('status-pill').textContent = `Library v1.0.0 — ${features.length} modules`;
    });

    // If DOM is already ready
    if (document.readyState !== 'loading') {
      renderDashboard();
      showToast('🛡️ HydeSecurity Library Loaded — All modules ready');
      el('status-pill').textContent = `Library v1.0.0 — ${features.length} modules`;
    }
  