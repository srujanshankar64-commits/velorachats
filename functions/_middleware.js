export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  if (url.pathname.startsWith('/assets/')) {
    const assetUrl = 'https://ece49fed.velorachats.pages.dev' + url.pathname;
    return fetch(assetUrl);
  }

  try {
    const { default: server } = await import('../dist/server/server.js');
    return server.fetch(context.request, context.env, context);
  } catch (e) {
    return new Response('Server error: ' + e.message, { status: 500 });
  }
}
