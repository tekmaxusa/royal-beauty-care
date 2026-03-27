/**
 * Browser notifications require a secure context (HTTPS or http://localhost).
 * http://192.168.x.x etc. often cannot show the permission prompt.
 */

export function notificationsApiAvailable(): boolean {
  return typeof Notification !== 'undefined';
}

export function notificationsSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export function currentNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsApiAvailable()) return 'unsupported';
  return Notification.permission;
}

/**
 * Must run from a click handler. Resolves when the user answers or if the API is unavailable.
 */
export async function requestSiteNotificationPermission(): Promise<
  NotificationPermission | 'unsupported' | 'insecure'
> {
  if (!notificationsApiAvailable()) return 'unsupported';
  if (!notificationsSecureContext()) return 'insecure';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}
