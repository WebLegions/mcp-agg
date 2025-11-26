- migrate state to juris fluent-state
- integrrate docs with [pages-cms](https://github.com/pages-cms/pages-cms)
- migrate to classless pico-css https://picocss.com/docs/classless
- remove istanbul-ignore from api-client and sse-session 
- add copy-pase options from ui to service and back (see below)
- implement client SPA/WPA (https://javascript.plainenglish.io/why-pwas-are-exploding-in-2025-and-how-you-can-build-one-in-a-weekend-ed8a10b9eac7






// The actual capability
const item = new ClipboardItem({
  'text/plain': new Blob([code], { type: 'text/plain' }),
  'text/html': new Blob([prettified], { type: 'text/html' }),
  [web myapp+json]: new Blob([JSON.stringify(metadata)], { type: 'application/json' })
});

await navigator.clipboard.write([...

// paste
async function handlePaste() {
  const items = await navigator.clipboard.read();
  
  for (const item of items) {
    console.log('Available formats:', item.types);
    // ["text/plain", "text/html", "web myapp+json"]
    
    // Now check for specific formats
    if (item.types.includes('web myapp+json')) {
      // Perfect. User pasted from your app. Full reconstruction.
      const blob = await item.getType('web myapp+json');
      const data = JSON.parse(await blob.text());
      restoreWithMetadata(data);
    } 
    else if (item.types.includes('text/html')) {
      // Good. User pasted from a rich editor. Parse HTML.
      const blob = await item.getType('text/html');
      const html = await blob.text();
      restoreFromHtml(html);
    } 
    else if (item.types.includes('text/plain')) {
      // Acceptable. User pasted from terminal or plain text editor.
      const blob = await item.getType('text/plain');
      const text = await blob.text();
      restoreFromPlain(text);
    }
  }
}