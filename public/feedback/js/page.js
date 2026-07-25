document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('feedbackForm')
  const message = document.getElementById('feedbackText')
  const sendButton = document.getElementById('sendFeedbackButton')
  const status = document.getElementById('feedbackStatus')

  const syncSendButton = function () {
    sendButton.disabled = message.value.trim() === ''
  }

  message.addEventListener('input', syncSendButton)
  syncSendButton()

  form.addEventListener('submit', function (event) {
    event.preventDefault()

    const text = message.value.trim()

    if (!text) {
      return
    }

    // Blocks a second submission while the first is still in flight.
    sendButton.disabled = true
    status.textContent = 'Sending your feedback…'
    status.classList.remove('form-status-sent', 'form-status-failed')

    sendFeedbackMessage(text)
      .then(function () {
        message.value = ''
        status.textContent = 'Feedback sent. Thanks for taking the time.'
        status.classList.add('form-status-sent')
      })
      .catch(function () {
        // The text is left in place so nothing has to be retyped.
        sendButton.disabled = false
        status.textContent = 'Feedback not sent. Check your connection and try again.'
        status.classList.add('form-status-failed')
      })
  })
})
