const KEY = "tc_admin_sound";
let ctx = null;
let loopTimer = null;

export const soundEnabled = () => localStorage.getItem(KEY) !== "off";
export const setSoundEnabled = (on) => localStorage.setItem(KEY, on ? "on" : "off");

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* unsupported */ }
}

function tone(freq, start, dur, type = "square", vol = 0.9) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.setValueAtTime(vol, start + dur - 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(ctx.destination); o.start(start); o.stop(start + dur + 0.02);
}

export function playNewOrderSound() {
  if (!soundEnabled()) return;
  try {
    unlockAudio();
    const t = ctx.currentTime;
    // loud siren-like triple burst
    [0, 0.22, 0.44].forEach((off) => { tone(1046, t + off, 0.18); tone(1568, t + off + 0.09, 0.12, "square", 0.7); });
  } catch { /* blocked */ }
}

export function startAlarm() {
  if (loopTimer) return;
  playNewOrderSound();
  loopTimer = setInterval(playNewOrderSound, 1500);
}

export function stopAlarm() {
  if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
}

export const alarmActive = () => loopTimer !== null;
