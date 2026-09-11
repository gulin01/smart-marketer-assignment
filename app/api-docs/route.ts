/**
 * Swagger UI, served as a plain document rather than a React page — the assets
 * are self-hosted from public/swagger (see scripts/copy-swagger-assets.mjs), so
 * the page works with no network access.
 */
const PAGE = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API 문서 · Lead Magnet CRM</title>
    <link rel="stylesheet" href="/swagger/swagger-ui.css">
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
      .swagger-ui .info { margin: 2rem 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/swagger/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api-docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
