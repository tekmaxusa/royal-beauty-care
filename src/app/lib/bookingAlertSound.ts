/**
 * Merchant new-request alerts:
 * - Desktop notifications (if allowed) for banner + optional OS sound — many OSes mute web notifications.
 * - Web Audio chime always runs too so you get a reliable sound while the tab is open (after audio is unlocked).
 */

let sharedAudioContext: AudioContext | null = null;
let alertRepeatTimer: number | null = null;
let lastAlertNotification: Notification | null = null;

const REPEAT_MS = 3_200;
const NOTIF_TAG = 'rbc-merchant-booking-alert';

function getAudioContextClass(): (typeof AudioContext) | null {
  return (
    window.AudioContext ||
    ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null) ||
    null
  );
}

function ensureContext(): AudioContext | null {
  try {
    const AC = getAudioContextClass();
    if (!AC) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AC();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Call from a user gesture. Unlocks Web Audio for this tab (fallback path).
 */
export function unlockBookingAudioForAlerts(): Promise<void> {
  const ctx = ensureContext();
  if (!ctx) return Promise.resolve();
  return ctx.resume().then(() => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.frequency.value = 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      /* ignore */
    }
  });
}

function canUseNotificationSound(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function postBookingAlertNotification(body: string): void {
  try {
    lastAlertNotification?.close();
    const opts: NotificationOptions & { renotify?: boolean } = {
      body: body.slice(0, 220),
      tag: NOTIF_TAG,
      renotify: true,
      silent: false,
    };
    lastAlertNotification = new Notification('Royal Beauty Care — new booking', opts);
  } catch {
    /* ignore */
  }
}

/**
 * Loud four-note chime (Web Audio fallback).
 */
export function playMerchantRequestAlertSound(): void {
  try {
    const ctx = ensureContext();
    if (!ctx || ctx.state === 'closed') return;

    const run = () => {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.92;
      master.connect(ctx.destination);

      const playTone = (freq: number, start: number, dur: number, vol: number) => {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc2.frequency.setValueAtTime(freq * 2, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.04);
        g.gain.linearRampToValueAtTime(vol * 0.75, start + dur * 0.45);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g);
        osc2.connect(g);
        g.connect(master);
        osc.start(start);
        osc2.start(start);
        osc.stop(start + dur + 0.03);
        osc2.stop(start + dur + 0.03);
      };

      playTone(523.25, now, 0.26, 0.38);
      playTone(659.25, now + 0.22, 0.26, 0.36);
      playTone(783.99, now + 0.44, 0.28, 0.34);
      playTone(1046.5, now + 0.68, 0.34, 0.32);

      window.setTimeout(() => {
        try {
          master.disconnect();
        } catch {
          /* ignore */
        }
      }, 1300);
    };

    void ctx.resume().then(run).catch(() => {
      try {
        run();
      } catch {
        /* locked */
      }
    });
  } catch {
    /* ignore */
  }
}

/** @deprecated use playMerchantRequestAlertSound */
export function playBookingAlertSound(): void {
  playMerchantRequestAlertSound();
}

/**
 * Repeating alert until `stopMerchantRequestAlertLoop`.
 * Each tick: Web Audio chime + desktop notification (if permitted). OS may still silence notifications — the chime is the reliable cue in-tab.
 */
export function startMerchantRequestAlertLoop(message: string): void {
  stopMerchantRequestAlertLoop();

  const ping = () => {
    if (canUseNotificationSound()) {
      postBookingAlertNotification(message);
    }
    playMerchantRequestAlertSound();
  };

  const ctx = ensureContext();
  void ctx?.resume().catch(() => {});

  ping();
  alertRepeatTimer = window.setInterval(ping, REPEAT_MS);
}

export function stopMerchantRequestAlertLoop(): void {
  if (alertRepeatTimer !== null) {
    window.clearInterval(alertRepeatTimer);
    alertRepeatTimer = null;
  }
  try {
    lastAlertNotification?.close();
  } catch {
    /* ignore */
  }
  lastAlertNotification = null;
}
