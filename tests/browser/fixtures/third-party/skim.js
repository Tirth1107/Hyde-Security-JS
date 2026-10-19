window.__skim = { read: document.getElementById('cc').value }
let got = 0
document.getElementById('cc').addEventListener('input', () => { got++ })
window.__skim.listenerWorks = () => got
