let sharedAudioCtx;
let activeAudio = null;
let chimeTimer = null;
let ringing = false;
let pendingUrl = "";

const playFallbackChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const chime = (frequency, startAt, length = 0.12) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + length);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + length + 0.02);
    };
    const now = ctx.currentTime;
    chime(880, now, 0.11);
    chime(1174, now + 0.14, 0.14);
  } catch (_) { /* ignore */ }
};

export const stopNotificationRing = () => {
  ringing = false;
  pendingUrl = "";
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (_) { /* ignore */ }
    activeAudio = null;
  }
  if (chimeTimer) {
    clearInterval(chimeTimer);
    chimeTimer = null;
  }
};

const isPlaying = () => {
  if (chimeTimer) return true;
  return Boolean(activeAudio && !activeAudio.paused);
};

const beginRing = (url) => {
  if (url) {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.9;
    activeAudio = audio;
    const play = audio.play();
    if (play?.catch) {
      play.catch(() => {
        if (!ringing) return;
        if (activeAudio === audio) activeAudio = null;
        playFallbackChime();
        if (!chimeTimer) chimeTimer = setInterval(playFallbackChime, 2500);
      });
    }
    return;
  }
  playFallbackChime();
  chimeTimer = setInterval(playFallbackChime, 2500);
};

/** Start or keep looping while unread > 0. Pass falsy shouldPlay to stop. */
export const syncNotificationRing = (url, shouldPlay) => {
  if (!shouldPlay) {
    stopNotificationRing();
    return;
  }
  const nextUrl = url || "";
  if (ringing && isPlaying() && pendingUrl === nextUrl) return;

  stopNotificationRing();
  ringing = true;
  pendingUrl = nextUrl;
  beginRing(nextUrl);
};

/** Call after a user gesture so browsers allow audio. */
export const unlockNotificationAudio = (url) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume().catch(() => {});
    }
  } catch (_) { /* ignore */ }
  if (!ringing) return;
  if (isPlaying()) return;
  const tone = url || pendingUrl;
  pendingUrl = "";
  syncNotificationRing(tone, true);
};

export const notifyNotificationsChanged = () => {
  window.dispatchEvent(new CustomEvent("crm:notifications-changed"));
};
