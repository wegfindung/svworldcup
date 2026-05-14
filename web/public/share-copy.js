document.addEventListener('click', function (event) {
  var target = event.target
  if (!(target instanceof Element)) {
    return
  }

  var button = target.closest('[data-copy-share-text]')
  if (!button) {
    return
  }

  var text = button.getAttribute('data-copy-share-text') || ''
  if (!navigator.clipboard || !text) {
    return
  }

  navigator.clipboard
    .writeText(text)
    .then(function () {
      button.textContent = 'Copied'
    })
    .catch(function () {
      button.textContent = 'Copy failed'
    })
})
