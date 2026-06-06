export async function onRequest(context) {
  try {
    const { default: handler } = await import('../dist/server/server.js');
    return handler(context.request);
  } catch (e) {
    return new Response('Server error: ' + e.message, { status: 500 });
  }
}
