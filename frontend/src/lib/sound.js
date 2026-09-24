const KEY = "tc_admin_sound";
let ctx = null;

export const soundEnabled = () => localStorage.getItem(KEY) !== "off";
export const setSoundEnabled = (on) => localStorage.setItem(KEY, on ? "on" : "off");

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* unsupported */ }
}

export function playNewOrderSound() {
  if (!soundEnabled()) return;
  try {
    unlockAudio();
    const notes = [880, 1174, 1568];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch { /* blocked */ }
}
