// Shared feedback submission, used by the feedback page and the playground.
//
// The Apps Script endpoint is cross-origin and sends no CORS headers, so the
// response is opaque: a resolved promise means the request left the browser,
// not that the server stored it. A rejection means it never went out at all.
const FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyC85weq4p2Ra2zbfyGrA4wC41s3ev-UumQek7xJMUtRmr-qGuXip6NN9m1k1GFCiT-/exec'

function sendFeedbackMessage(message) {
  const url = `${FEEDBACK_ENDPOINT}?message=${encodeURIComponent(message)}`

  return fetch(url, { method: 'GET', mode: 'no-cors' })
}
