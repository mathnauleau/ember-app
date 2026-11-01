const atHome = () => ['', '#', '#/'].includes(window.location.hash)

// Offline support, plus updates that only ever land on Home, never in the middle of a session.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  // The very first install also takes control of this page, and that isn't an update.
  let installed = navigator.serviceWorker.controller !== null
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (installed) window.location.reload()
    installed = true
  })

  void navigator.serviceWorker.register('/sw.js').then((registration) => {
    const applyIfSafe = () => {
      if (atHome()) registration.waiting?.postMessage('apply-update')
    }
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', applyIfSafe)
    })
    window.addEventListener('hashchange', applyIfSafe)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update().catch(() => {})
    })
    applyIfSafe()
  })
}
