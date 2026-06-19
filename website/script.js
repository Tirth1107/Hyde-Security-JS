/* =========================================================
   HYDE SECURITY JS — Documentation Website
   Interactive Scripts
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Navbar scroll effect ---------- */
    const navbar = document.querySelector('.navbar')
    const handleScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    /* ---------- Mobile hamburger ---------- */
    const hamburger = document.querySelector('.hamburger')
    const navLinks = document.querySelector('.navbar-links')
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open')
            navLinks.classList.toggle('open')
        })
        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open')
                navLinks.classList.remove('open')
            })
        })
    }

    /* ---------- Tabbed code examples ---------- */
    document.querySelectorAll('.tabs').forEach(tabContainer => {
        const buttons = tabContainer.querySelectorAll('.tab-btn')
        const wrapper = tabContainer.closest('.quickstart-tabs') || tabContainer.parentElement
        const contents = wrapper.querySelectorAll('.tab-content')

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab
                buttons.forEach(b => b.classList.remove('active'))
                contents.forEach(c => c.classList.remove('active'))
                btn.classList.add('active')
                const targetContent = wrapper.querySelector(`[data-tab-content="${target}"]`)
                if (targetContent) targetContent.classList.add('active')
            })
        })
    })

    /* ---------- Feature category accordion ---------- */
    document.querySelectorAll('.feature-category-header').forEach(header => {
        header.addEventListener('click', () => {
            const parent = header.closest('.feature-category')
            parent.classList.toggle('open')
        })
    })

    /* ---------- API accordion ---------- */
    document.querySelectorAll('.api-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const parent = header.closest('.api-group')
            parent.classList.toggle('open')
        })
    })

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const parent = question.closest('.faq-item')
            // Close others
            document.querySelectorAll('.faq-item.open').forEach(item => {
                if (item !== parent) item.classList.remove('open')
            })
            parent.classList.toggle('open')
        })
    })

    /* ---------- Copy to clipboard ---------- */
    document.querySelectorAll('.copy-btn, .code-block-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const codeEl = btn.closest('.install-cmd, .hero-install, .code-block-wrapper')
            let text = ''
            if (codeEl) {
                const code = codeEl.querySelector('code') || codeEl.querySelector('pre')
                if (code) text = code.textContent.trim()
            }
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    const original = btn.textContent
                    btn.textContent = '✓ Copied!'
                    btn.style.color = '#22c55e'
                    setTimeout(() => {
                        btn.textContent = original
                        btn.style.color = ''
                    }, 2000)
                })
            }
        })
    })

    /* ---------- Scroll reveal animations ---------- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible')
            }
        })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        revealObserver.observe(el)
    })

    /* ---------- Smooth scroll for anchor links ---------- */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const target = document.querySelector(link.getAttribute('href'))
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        })
    })

    /* ---------- Open first feature category by default ---------- */
    const firstCategory = document.querySelector('.feature-category')
    if (firstCategory) firstCategory.classList.add('open')

})
