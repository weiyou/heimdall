const CSS = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.6.1/github-markdown.min.css'

export function buildPage(html) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heimdall</title>
  <link rel="stylesheet" href="${CSS}">
  <style>
    body { box-sizing: border-box; max-width: 980px; margin: 0 auto; padding: 45px; }
  </style>
</head>
<body>
  <article class="markdown-body" id="content">${html}</article>
  <script>
    const es = new EventSource('/events')
    es.onmessage = e => document.getElementById('content').innerHTML = JSON.parse(e.data)
  </script>
</body>
</html>`
}
