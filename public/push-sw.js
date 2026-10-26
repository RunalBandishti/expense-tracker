self.addEventListener('push', (event) => {
  const reminder = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(reminder.title || 'Expense Manager', {
      body: reminder.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: reminder.tag,
      data: { url: reminder.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        try {
          await client.focus();
          await client.navigate(url);
          return;
        } catch {
          // Not every open window can be navigated from here; try the next, then open a new one.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
