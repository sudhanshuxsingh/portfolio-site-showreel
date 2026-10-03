"""
Mixes the showreel soundtrack: the music edit + synthesized sound design.

    npx tsx scripts/export-cues.ts        # out/cues.json from src/timeline.ts + src/cues.ts
    python3 scripts/mix.py                # → public/audio/soundtrack.wav
    python3 scripts/mix.py --no-slow      # intro/outro soft but at normal speed

Music: public/audio/music/mere-paas-aao.mp3 ("Mere Paas Aao Mere Dosto"), per
src/timeline.ts. The slowed hook with its vocals opens; from the drop, a bed of
whole bars from the song's vocal-free groove passages runs end to end, each
join matched by rhythm and crossfaded onto a downbeat, then ridden to one
constant low level; the slowed groove closes. The effects sit on top, and the
master is limited to -14 LUFS for phones.

Every sound effect is synthesized here. The UI click is the site's own recipe
(src/lib/sfx.ts: sine 900→500 Hz over 55 ms); the avatar egg uses the site's
own sample (public/audio/conquerors-haki.mp3).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
RNG = np.random.default_rng(20261002)


# ---------------------------------------------------------------- utilities

def decode(path: Path) -> np.ndarray:
    """Any audio file → float32 stereo (2, n) at SR via ffmpeg."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()


def db(x: float) -> float:
    return 10 ** (x / 20)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)) + 1e-12))


def t_axis(n: int) -> np.ndarray:
    return np.arange(n) / SR


def stereo(mono: np.ndarray, pan: float = 0.0) -> np.ndarray:
    """Equal-power pan."""
    angle = (pan + 1) * np.pi / 4
    return np.stack([mono * np.cos(angle), mono * np.sin(angle)])


def biquad(kind: str, freq: float, q: float = 0.707):
    return signal.iirfilter(2, freq / (SR / 2), btype=kind, ftype='butter', output='sos') if kind != 'band' else \
        signal.iirfilter(2, [max(20, freq / (1 + 1 / (2 * q))) / (SR / 2), min(SR / 2 - 100, freq * (1 + 1 / (2 * q))) / (SR / 2)],
                         btype='bandpass', ftype='butter', output='sos')


def filt(x: np.ndarray, kind: str, freq: float, q: float = 0.707) -> np.ndarray:
    return signal.sosfilt(biquad(kind, freq, q), x, axis=-1)


def sweep_filter(x: np.ndarray, kind: str, freqs: np.ndarray, block: int = 512, q: float = 0.9) -> np.ndarray:
    """Time-varying filter: cutoff follows `freqs` (one value per sample)."""
    x = np.atleast_2d(x)
    out = np.zeros_like(x)
    zi = None
    for start in range(0, x.shape[1], block):
        f = float(np.clip(freqs[min(start + block // 2, len(freqs) - 1)], 30, SR / 2 - 200))
        sos = biquad(kind, f, q)
        if zi is None:
            zi = np.zeros((x.shape[0], sos.shape[0], 2))
        for ch in range(x.shape[0]):
            out[ch, start:start + block], zi[ch] = signal.sosfilt(sos, x[ch, start:start + block], zi=zi[ch])
    return out


def env_ar(n: int, attack: float, release: float, curve: float = 4.0) -> np.ndarray:
    t = t_axis(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.exp(-np.clip(t - attack, 0, None) * curve / max(release, 1e-4))
    return a * r


def impulse_response(seconds: float = 2.4, decay: float = 3.2, predelay: float = 0.018) -> np.ndarray:
    n = int(seconds * SR)
    t = t_axis(n)
    ir = RNG.standard_normal((2, n)) * np.exp(-t * decay)
    ir = filt(ir, 'low', 6500)
    ir[:, : int(predelay * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


IR = impulse_response()


def reverb(x: np.ndarray, wet: float) -> np.ndarray:
    tail = signal.fftconvolve(x, IR, axes=-1)[:, : x.shape[1] + IR.shape[1]]
    dry = np.pad(x, ((0, 0), (0, tail.shape[1] - x.shape[1])))
    return dry * (1 - wet * 0.35) + tail * wet * 0.55


def place(bus: np.ndarray, clip: np.ndarray, t: float, gain: float = 1.0):
    i = int(round(t * SR))
    if i >= bus.shape[1]:
        return
    j = min(bus.shape[1], i + clip.shape[1])
    if i < 0:
        clip = clip[:, -i:]
        i = 0
    bus[:, i:j] += clip[:, : j - i] * gain


def write_wav(path: Path, x: np.ndarray):
    import wave
    pcm = (np.clip(x, -1, 1).T * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def normalize(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = np.max(np.abs(x)) + 1e-9
    return x * (peak / m)


# ---------------------------------------------------------------- sound design

def sfx_click(pan=0.0):
    """The site's UI click, src/lib/sfx.ts: sine 900→500 Hz exp sweep, 8 ms attack, 55 ms."""
    d = 0.055
    n = int((d + 0.03) * SR)
    t = t_axis(n)
    k = np.log(500 / 900) / d
    phase = 2 * np.pi * 900 * (np.exp(k * np.minimum(t, d)) - 1) / k + 2 * np.pi * 500 * np.maximum(t - d, 0)
    g = np.where(t < 0.008, 0.0001 * (1 / 0.0001) ** (t / 0.008), np.exp(np.log(0.0001) * (t - 0.008) / (d - 0.008)))
    g[t > d] = 0
    return stereo(np.sin(phase) * g, pan)


def sfx_tick(pan=0.0):
    n = int(0.04 * SR)
    noise = filt(RNG.standard_normal(n), 'band', 3200, 2.5) * env_ar(n, 0.0005, 0.008, 5)
    tone = np.sin(2 * np.pi * 2300 * t_axis(n)) * env_ar(n, 0.0005, 0.012, 5) * 0.4
    return stereo(normalize(noise + tone), pan)


def sfx_key(pan=0.0, heavy=False):
    n = int((0.16 if heavy else 0.07) * SR)
    t = t_axis(n)
    click = filt(RNG.standard_normal(n), 'band', RNG.uniform(1800, 3200), 1.6) * env_ar(n, 0.0004, 0.012, 6)
    thock_f = RNG.uniform(140, 190) if not heavy else 95
    thock = np.sin(2 * np.pi * thock_f * t) * env_ar(n, 0.001, 0.05 if heavy else 0.025, 5) * (1.4 if heavy else 0.6)
    body = filt(RNG.standard_normal(n), 'low', 900) * env_ar(n, 0.001, 0.03, 5) * (0.8 if heavy else 0.25)
    x = normalize(click * 0.9 + thock + body)
    return stereo(x, pan)


def sfx_whoosh(dur=0.45, pan=0.0, rising=False):
    """Air moving past: wide stereo noise, a resonant sweep that peaks on the pass-by, and a pan across."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    peak = 0.6 if not rising else 0.94
    shape = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.5)
    noise = RNG.standard_normal((2, n))
    centre = (380 + 3400 * shape ** 1.4) if not rising else 260 * (22 ** t)
    air = sweep_filter(noise, 'band', centre, q=1.5)
    body = filt(noise, 'low', 420) * 0.4
    x = (air + body) * shape
    pans = np.clip(pan + (t - 0.5) * 0.9, -1, 1)
    x = np.stack([x[0] * np.cos((pans + 1) * np.pi / 4), x[1] * np.sin((pans + 1) * np.pi / 4)])
    return normalize(reverb(x, 0.16)[:, : int(n * 1.2)])


def sfx_impact(soft=False):
    n = int((1.6 if not soft else 0.9) * SR)
    t = t_axis(n)
    f = 68 * np.exp(-t * 2.2) + 30
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.6 if not soft else 4.5))
    crack = filt(RNG.standard_normal(n), 'low', 3000 if not soft else 1600) * env_ar(n, 0.0008, 0.06, 6)
    body = filt(RNG.standard_normal(n), 'low', 180) * env_ar(n, 0.002, 0.35, 4) * 1.5
    x = normalize(sub * 1.4 + crack * (0.7 if not soft else 0.35) + body * 0.6)
    return reverb(stereo(x), 0.35)[:, : int(n * 1.3)]


def sfx_riser(dur=2.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = sweep_filter(RNG.standard_normal(n), 'high', 150 * (40 ** t))[0]
    saw = signal.sawtooth(2 * np.pi * np.cumsum(180 * (6 ** t)) / SR) * 0.25
    saw = filt(saw, 'low', 3000)
    amp = t ** 2.4
    x = normalize((noise + saw) * amp)
    return reverb(stereo(x), 0.25)[:, :n]


def sfx_pop(pan=0.0):
    n = int(0.09 * SR)
    t = t_axis(n)
    f = 560 + 520 * np.clip(t / 0.03, 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.001, 0.035, 5)
    return stereo(normalize(x), pan)


def sfx_blip(pan=0.0):
    n = int(0.11 * SR)
    t = t_axis(n)
    tone = np.sign(np.sin(2 * np.pi * 660 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 990 * t)) * 0.3
    tone = np.round(tone * 6) / 6  # crushed
    x = filt(tone, 'low', 4500) * env_ar(n, 0.001, 0.07, 4)
    return reverb(stereo(normalize(x), pan), 0.2)[:, : int(n * 2)]


def sfx_glitch(dur=0.7):
    n = int(dur * SR)
    x = np.zeros(n)
    i = 0
    while i < n:
        length = int(RNG.uniform(0.012, 0.05) * SR)
        if RNG.random() < 0.65:
            seg = RNG.standard_normal(length)
            seg = np.round(seg * 3) / 3
            seg = filt(seg, 'band', RNG.uniform(800, 5000), 1.2) * RNG.uniform(0.3, 1)
            x[i:i + length] += seg[: n - i]
        i += length + int(RNG.uniform(0.004, 0.03) * SR)
    return stereo(normalize(x) * 0.9)


def sfx_thump():
    n = int(0.35 * SR)
    t = t_axis(n)
    f = 95 * np.exp(-t * 6) + 50
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.001, 0.16, 4)
    x += filt(RNG.standard_normal(n), 'low', 1200) * env_ar(n, 0.0005, 0.02, 6) * 0.5
    return reverb(stereo(normalize(x)), 0.15)[:, : int(n * 1.6)]


def sfx_boing():
    n = int(0.5 * SR)
    t = t_axis(n)
    f = 240 + 70 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 7)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.002, 0.25, 4)
    return stereo(normalize(x) * 0.8)


def sfx_scan():
    n = int(0.85 * SR)
    t = np.linspace(0, 1, n)
    noise = sweep_filter(RNG.standard_normal(n), 'band', 300 * (25 ** t), q=2.2)[0]
    tone = np.sin(2 * np.pi * np.cumsum(220 * (8 ** t)) / SR) * 0.25
    x = normalize((noise + tone) * np.sin(np.pi * t) ** 0.8)
    return reverb(stereo(x), 0.25)[:, :n]


def sfx_shimmer():
    n = int(1.6 * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for _ in range(14):
        f = RNG.uniform(2800, 9000)
        x += np.sin(2 * np.pi * f * t + RNG.uniform(0, 6.28)) * (0.5 + 0.5 * np.sin(2 * np.pi * RNG.uniform(5, 13) * t))
    x *= env_ar(n, 0.06, 0.9, 3)
    return reverb(stereo(normalize(x)), 0.5)[:, :n]


def sfx_rumble(dur=2.6):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    brown = np.cumsum(RNG.standard_normal(n))
    brown = filt(brown - np.mean(brown), 'high', 25)
    brown = filt(brown, 'low', 140)
    sub = np.sin(2 * np.pi * np.cumsum(36 + 18 * t) / SR)
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * (3 + 9 * t) * t * dur)
    x = normalize(normalize(brown) * 0.8 + sub * 0.8) * (t ** 1.6) * trem
    return stereo(x)


def sfx_scratch(pan=0.0):
    n = int(0.13 * SR)
    jitter = np.abs(RNG.standard_normal(n // 240 + 1)).repeat(240)[:n]
    x = filt(RNG.standard_normal(n), 'band', 3400, 1.5) * jitter * env_ar(n, 0.005, 0.1, 3)
    return stereo(normalize(x) * 0.7, pan)


def sfx_hit():
    n = int(0.3 * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * 70 * t) * env_ar(n, 0.001, 0.12, 4) + filt(RNG.standard_normal(n), 'low', 2400) * env_ar(n, 0.0005, 0.03, 6) * 0.6
    return stereo(normalize(x))


def sfx_boom(dur=2.4):
    """Sub drop for the big landings, saturated so phone speakers still feel it."""
    n = int(dur * SR)
    t = t_axis(n)
    sub = np.sin(2 * np.pi * np.cumsum(34 + 44 * np.exp(-t * 3.2)) / SR) * np.exp(-t * 1.5)
    sub = np.tanh(sub * 2.4) / np.tanh(2.4)
    thud = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t * 14)) / SR) * env_ar(n, 0.001, 0.1, 4) * 0.7
    click = filt(RNG.standard_normal(n), 'band', 2600, 1.0) * env_ar(n, 0.0004, 0.01, 6) * 0.45
    return reverb(stereo(normalize(sub + thud + click)), 0.22)[:, : int(n * 1.05)]


def sfx_flash(pan=0.0):
    """A trailer-style hit for hard cuts: transient, punch, a short metallic ring, air."""
    n = int(0.8 * SR)
    t = t_axis(n)
    transient = filt(RNG.standard_normal(n), 'high', 2200) * env_ar(n, 0.0003, 0.018, 7)
    punch = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(46 + 170 * np.exp(-t * 26)) / SR) * env_ar(n, 0.0008, 0.16, 4))
    ring = sum(a * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6.28)) for f, a in ((523, 0.5), (784, 0.35), (1047, 0.25), (1568, 0.15)))
    ring *= env_ar(n, 0.001, 0.42, 4) * 0.14
    x = stereo(normalize(transient * 0.8 + punch + ring), pan)
    x += filt(RNG.standard_normal((2, n)), 'band', 6500, 0.8) * env_ar(n, 0.001, 0.12, 5) * 0.18
    return reverb(normalize(x), 0.28)[:, : int(n * 1.2)]


def sfx_reverse(dur=1.0):
    """Reverse-cymbal swell. Its cue time is when it ENDS, on the hit it leads into."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = sweep_filter(RNG.standard_normal((2, n)), 'high', 700 * (7 ** t), q=0.7)
    x += sum(np.sin(2 * np.pi * f * t * dur + RNG.uniform(0, 6.28)) for f in (3136, 4699, 6272)) * 0.04
    x *= t ** 3.2
    x[:, -int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return normalize(x)


def sfx_tock(pan=0.0):
    """A soft wooden knock for a headline word landing."""
    n = int(0.12 * SR)
    t = t_axis(n)
    body = np.sin(2 * np.pi * np.cumsum(170 + 260 * np.exp(-t * 30)) / SR) * env_ar(n, 0.0006, 0.05, 5)
    click = filt(RNG.standard_normal(n), 'band', 3800, 2.0) * env_ar(n, 0.0003, 0.006, 6) * 0.5
    return stereo(normalize(body + click), pan)


def sfx_shine(pan=0.0):
    """A glint for the serif word: soft bell partials in the song's key, with a long tail."""
    n = int(0.9 * SR)
    t = t_axis(n)
    x = (np.sin(2 * np.pi * 1760 * t) + 0.55 * np.sin(2 * np.pi * 2637 * t) + 0.25 * np.sin(2 * np.pi * 3520 * t))
    x *= env_ar(n, 0.003, 0.5, 4)
    return reverb(stereo(normalize(x), pan), 0.45)[:, :n]


HAKI = decode(ROOT / 'public/audio/conquerors-haki.mp3')

FACTORY = {
    'click': lambda c: sfx_click(c.get('pan', 0)),
    'tick': lambda c: sfx_tick(c.get('pan', 0)),
    'key': lambda c: sfx_key(c.get('pan', 0)),
    'keyHeavy': lambda c: sfx_key(c.get('pan', 0), heavy=True),
    'whoosh': lambda c: sfx_whoosh(0.42, c.get('pan', 0)),
    'whooshLong': lambda c: sfx_whoosh(1.05, c.get('pan', 0)),
    'impact': lambda c: sfx_impact(),
    'impactSoft': lambda c: sfx_impact(soft=True),
    'riser': lambda c: sfx_riser(c.get('dur', 2.0)),
    'pop': lambda c: sfx_pop(c.get('pan', 0)),
    'blip': lambda c: sfx_blip(c.get('pan', 0)),
    'glitch': lambda c: sfx_glitch(c.get('dur', 0.7)),
    'thump': lambda c: sfx_thump(),
    'boing': lambda c: sfx_boing(),
    'scan': lambda c: sfx_scan(),
    'shimmer': lambda c: sfx_shimmer(),
    'rumble': lambda c: sfx_rumble(c.get('dur', 2.6)),
    'haki': lambda c: HAKI,
    'scratch': lambda c: sfx_scratch(c.get('pan', 0)),
    'hit': lambda c: sfx_hit(),
    'swish': lambda c: sfx_whoosh(0.24, c.get('pan', 0)),
    'boom': lambda c: sfx_boom(),
    'flash': lambda c: sfx_flash(c.get('pan', 0)),
    'reverse': lambda c: sfx_reverse(c.get('dur', 1.0)),
    'tock': lambda c: sfx_tock(c.get('pan', 0)),
    'shine': lambda c: sfx_shine(c.get('pan', 0)),
}

# Per-type level (dB) before each cue's own trim.
LEVEL = {
    'click': -4, 'tick': -15, 'key': -12, 'keyHeavy': -6, 'whoosh': -10, 'whooshLong': -10,
    'impact': -3, 'impactSoft': -5, 'riser': -10, 'pop': -12, 'blip': -8, 'glitch': -12,
    'thump': -4, 'boing': -12, 'scan': -8, 'shimmer': -14, 'rumble': -6, 'haki': -2,
    'scratch': -14, 'hit': -7, 'swish': -12, 'boom': -3, 'flash': -3, 'reverse': -10,
    'tock': -10, 'shine': -16,
}
REVERB_SEND = {
    'tick': 0.25, 'click': 0.12, 'pop': 0.2, 'whoosh': 0.2, 'key': 0.06, 'keyHeavy': 0.18, 'blip': 0.2,
    'haki': 0.18, 'tock': 0.22, 'flash': 0.2, 'swish': 0.15,
}


# ---------------------------------------------------------------- music

def music_segment(song: np.ndarray, seg: dict, slow: bool) -> np.ndarray:
    """Cut, (optionally) slow, filter and fade one of the slowed bookends."""
    rate = seg['rate'] if slow else 1.0
    span = seg['to'] - seg['from']
    if seg['rate'] != 1 and not slow:
        span /= seg['rate']  # same time on screen, just not slowed
    a = int(seg['from'] * SR)
    x = song[:, a:a + int(span * SR)].copy()
    if rate != 1:
        # Slowed like a turntable: tempo and pitch drop together.
        x = signal.resample_poly(x, 100, int(round(rate * 100)), axis=-1)
    n = x.shape[1]
    if seg.get('lowpass'):
        f0, f1 = seg['lowpass']
        x = sweep_filter(x, 'low', np.geomspace(f0, f1, n), q=0.8)
    fi, fo = int(seg['fadeIn'] * SR), int(seg['fadeOut'] * SR)
    if fi:
        x[:, :fi] *= np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    if fo:
        x[:, n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    if seg.get('reverb'):
        x = reverb(x, seg['reverb'])[:, : n + int(1.6 * SR)]
    return x


def flux(x: np.ndarray, t0: float, t1: float, hop: int = 96) -> np.ndarray:
    """Percussive onset envelope of the song between t0 and t1 (one value per hop)."""
    mono = x[:, int(t0 * SR):int(t1 * SR)].mean(0)
    _, _, z = signal.stft(mono, SR, nperseg=1024, noverlap=1024 - hop, boundary=None, padded=False)
    mag = np.log1p(100 * np.abs(z))
    env = np.maximum(0, np.diff(mag, axis=1)).sum(0)
    return np.concatenate([[0.0], env])


def seam(song: np.ndarray, end: float, start: float, window: float = 1.2, search: float = 0.045) -> float:
    """
    Where to leave a groove so the next one carries on in time: the point near
    `end` whose continuation has the same rhythm as the music after `start`.
    """
    hop = 96
    ref = flux(song, start, start + window, hop)
    span = flux(song, end - search, end + search + window, hop)
    scores = [
        np.dot(ref, span[k:k + len(ref)]) / (np.linalg.norm(span[k:k + len(ref)]) + 1e-9)
        for k in range(0, len(span) - len(ref))
    ]
    return end - search + int(np.argmax(scores)) * hop / SR


def build_bed(song: np.ndarray, bed: dict, grooves: dict):
    """
    Whole bars of the vocal-free grooves, end to end, joined on downbeats with a
    30 ms crossfade that ends on the downbeat, so every hit stays crisp. Returns
    the audio, the video time it starts at, and the video time of every join.
    """
    chunks = []
    for gid, bars in bed['plan']:
        g = grooves[gid]
        bar = (g['to'] - g['from']) / g['bars']
        chunks.append([g['from'], g['to'] if bars >= g['bars'] else g['from'] + bars * bar])
    for i in range(len(chunks) - 1):
        chunks[i][1] = seam(song, chunks[i][1], chunks[i + 1][0])
    xf = int(0.03 * SR)
    pick = int((chunks[0][0] - bed['pickup']) * SR)
    lead = song[:, int(bed['pickup'] * SR):int(bed['pickup'] * SR) + pick].copy()
    lead[:, :int(0.15 * SR)] *= np.linspace(0, 1, int(0.15 * SR))
    parts = []
    cursor = pick
    joins = []
    for i, (a, b) in enumerate(chunks):
        ia, ib = int(a * SR), int(b * SR)
        last = i == len(chunks) - 1
        x = song[:, ia - xf:ib + (xf if last else 0)].copy()
        # In over the 30 ms before this downbeat; out over the 30 ms before the next
        # one, so the next groove's downbeat is the only hit on the join.
        x[:, :xf] *= np.sin(np.linspace(0, np.pi / 2, xf)) ** 2
        x[:, -xf:] *= np.cos(np.linspace(0, np.pi / 2, xf)) ** 2
        joins.append(bed['downbeat'] + (cursor - pick) / SR)
        parts.append((cursor - xf, x))
        cursor += ib - ia
    audio = np.zeros((2, cursor + xf))
    audio[:, :pick] += lead
    for at, x in parts:
        audio[:, at:at + x.shape[1]] += x
    joins.append(bed['downbeat'] + (cursor - pick) / SR)
    return audio, bed['downbeat'] - pick / SR, joins


def peaking(x: np.ndarray, freq: float, gain: float, q: float = 0.8) -> np.ndarray:
    """RBJ peaking EQ."""
    a = 10 ** (gain / 40)
    w = 2 * np.pi * freq / SR
    alpha = np.sin(w) / (2 * q)
    b = [1 + alpha * a, -2 * np.cos(w), 1 - alpha * a]
    den = [1 + alpha / a, -2 * np.cos(w), 1 - alpha / a]
    return signal.lfilter(np.array(b) / den[0], np.array(den) / den[0], x, axis=-1)


def carve(x: np.ndarray) -> np.ndarray:
    """Make room in the bed for the effects: below 90 Hz for the booms, a dip at 2.5 kHz for clicks and knocks."""
    return peaking(filt(x, 'high', 90), 2500, -3.0)


def level(x: np.ndarray, target: float, hold: int = 0, window: float = 0.6, smooth: float = 1.4) -> np.ndarray:
    """
    Bring the bed to its level, then ride it there: a slow, zero-phase gain that
    moves at most 6 dB either way from the static gain, so it stays constant.
    """
    n = int(window * SR)
    power = np.convolve(np.mean(x ** 2, axis=0), np.ones(n) / n, mode='same')
    env = 10 * np.log10(power + 1e-12)
    static = target - np.median(env[hold:])
    gain_db = np.clip(target - env, static - 6, static + 6)
    gain_db[:hold] = gain_db[hold]
    b, a = signal.butter(1, 1 / (smooth * SR / 2))
    gain_db = signal.filtfilt(b, a, gain_db)
    return x * 10 ** (gain_db / 20)


def limiter(x: np.ndarray, ceiling: float, lookahead: float = 0.004, release: float = 0.12) -> np.ndarray:
    """Look-ahead peak limiter: the gain is already down when a peak arrives, then recovers."""
    from scipy.ndimage import minimum_filter1d
    la = int(lookahead * SR)
    peak = np.max(np.abs(x), axis=0)
    need = minimum_filter1d(np.minimum(1.0, ceiling / (peak + 1e-12)), size=2 * la + 1)
    coeff = np.exp(-1 / (release * SR))
    g = np.empty_like(need)
    current = 1.0
    for i, v in enumerate(need):
        current = v if v < current else v + (current - v) * coeff
        g[i] = current
    g = signal.filtfilt(*signal.butter(1, 2000 / (SR / 2)), g)
    return x * np.minimum(g, need)


def loudness(x: np.ndarray) -> float:
    import pyloudnorm
    return pyloudnorm.Meter(SR).integrated_loudness(x.T)


def main():
    slow = '--no-slow' not in sys.argv
    data = json.loads((ROOT / 'out/cues.json').read_text())
    length = int((data['duration'] + 0.5) * SR)
    music_bus = np.zeros((2, length), dtype=np.float64)
    sfx_bus = np.zeros((2, length), dtype=np.float64)
    send_bus = np.zeros((2, length), dtype=np.float64)

    song_path = ROOT / 'public/audio/music/mere-paas-aao.mp3'
    if song_path.exists():
        song = decode(song_path).astype(np.float64)
        bed = data['bed']
        audio, at, joins = build_bed(song, bed, data['grooves'])
        audio = level(carve(audio), bed['level'], hold=int((bed['downbeat'] - at) * SR))
        place(music_bus, audio, at)
        print(f'  bed: {len(joins) - 1} grooves, {joins[0]:.3f} → {joins[-1]:.3f} s; joins at',
              ' '.join(f'{j:.2f}' for j in joins[1:-1]))
        for seg in data['music']:
            x = music_segment(song, seg, slow)
            a = int(seg['fadeIn'] * SR) + 1
            body = x[:, a:max(a + 1, x.shape[1] - int((seg['fadeOut'] + 1.6) * SR))]
            x *= db(bed['level'] + seg['gain']) / rms(body)
            # The outro picks up exactly where the bed's last bar ends.
            place(music_bus, x, joins[-1] if seg['id'] == 'outro' else seg['at'])
    else:
        print('! music not found — mixing sound design only')

    for cue in data['cues']:
        clip = FACTORY[cue['type']](cue)
        gain = db(LEVEL[cue['type']] + cue.get('gain', 0))
        t = cue['t'] - clip.shape[1] / SR if cue['type'] == 'reverse' else cue['t']
        place(sfx_bus, clip, t, gain)
        if cue['type'] in REVERB_SEND:
            place(send_bus, clip, t, gain * REVERB_SEND[cue['type']])

    wet = signal.fftconvolve(send_bus, IR, axes=-1)[:, :length] * 0.6
    mix = music_bus + sfx_bus + wet
    if '--stems' in sys.argv:
        # QA: the music and the effects on their own, before mastering.
        for name, bus in (('music', music_bus), ('sfx', sfx_bus + wet)):
            write_wav(ROOT / f'out/{name}.wav', bus)

    # Master: the effects set the volume, not the music. Their loudness lands at
    # -13 LUFS, the bed stays as far below them as the timeline puts it (about
    # 11 LU), and a limiter holds the peaks under -1 dBFS.
    gain = db(-13.0 - loudness(sfx_bus + wet))
    mix = np.tanh(mix * gain * 1.1) / np.tanh(1.1)
    mix = limiter(mix, db(-1.0))
    # Short fade at the very end.
    tail = int(0.25 * SR)
    mix[:, -tail:] *= np.linspace(1, 0, tail)

    out = ROOT / ('public/audio/soundtrack.wav' if slow else 'public/audio/soundtrack-noslow.wav')
    write_wav(out, mix)
    peak = 20 * np.log10(np.max(np.abs(mix)))
    print(f'{out.relative_to(ROOT)} — {length / SR:.2f}s, {loudness(mix):.1f} LUFS, peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
