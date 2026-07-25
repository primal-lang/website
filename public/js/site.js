// Shared navbar behaviour for every page of the site.
document.addEventListener('DOMContentLoaded', function () {
  const toggler = document.querySelector('.navbar-toggler')
  const menu = document.getElementById('primary-nav')

  if (toggler && menu) {
    toggler.addEventListener('click', function () {
      const expanded = menu.classList.toggle('show')
      toggler.setAttribute('aria-expanded', expanded ? 'true' : 'false')
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
