let _audioCtx = null;
function ctx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

export function playSound(type) {
  try {
    const c = ctx();
    if (type === 'move' || type === 'capture') {
      const len = c.sampleRate * (type === 'capture' ? 0.18 : 0.1);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = c.createBufferSource(); src.buffer = buf;
      const filt = c.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = type === 'capture' ? 700 : 1800;
      filt.Q.value = type === 'capture' ? 3 : 1.5;
      const gain = c.createGain();
      gain.gain.setValueAtTime(type === 'capture' ? 0.55 : 0.35, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (type === 'capture' ? 0.18 : 0.1));
      src.connect(filt); filt.connect(gain); gain.connect(c.destination);
      src.start(); src.stop(c.currentTime + 0.2);
    } else if (type === 'king') {
      [523, 784].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.2, c.currentTime + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.4);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 0.5);
      });
    } else if (type === 'win') {
      [261, 329, 392, 523].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.18, c.currentTime + i * 0.13);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.13 + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + i * 0.13); o.stop(c.currentTime + i * 0.13 + 0.35);
      });
    } else if (type === 'lose') {
      [392, 330, 261].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.15, c.currentTime + i * 0.14);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.14 + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + i * 0.14); o.stop(c.currentTime + i * 0.14 + 0.35);
      });
    }
  } catch (e) {}
}
