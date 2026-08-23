// Shared navbar behaviour for every page of the site.
document.addEventListener('DOMContentLoaded', function () {
  const toggler = document.querySelector('.navbar-toggler')
  const menu = document.getElementById('primary-nav')

  if (toggler && menu) {
    toggler.addEventListener('click', function () {
      const expanded = menu.classList.toggle('show')
      toggler.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    })

    // The Playground entry opens a new tab, so this document stays loaded and
    // the dropdown has to close itself instead of relying on the next page load.
    // A modifier-click keeps the reader here on purpose, so the menu stays open.
    menu.addEventListener('click', function (event) {
      const plainClick = !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey

      if (plainClick && menu.classList.contains('show') && event.target.closest('a')) {
        menu.classList.remove('show')
        toggler.setAttribute('aria-expanded', 'false')
        // The link being collapsed away held focus; hand it to the control that reopens it.
        toggler.focus()
      }
    })
  }

  const navbar = document.querySelector('.navbar')

  if (navbar) {
    let scheduled = false

    const applyScrolledState = function () {
      navbar.classList.toggle('scrolled', window.scrollY > 10)
      scheduled = false
    }

    window.addEventListener('scroll', function () {
      if (!scheduled) {
        scheduled = true
        window.requestAnimationFrame(applyScrolledState)
      }
    }, { passive: true })

    applyScrolledState()
  }
})
