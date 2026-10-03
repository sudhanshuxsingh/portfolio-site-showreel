"""
Mixes the showreel soundtrack: the music edit + synthesized sound design.

    npx tsx scripts/export-cues.ts        # out/cues.json from src/timeline.ts + src/cues.ts
    python3 scripts/mix.py                # → public/audio/soundtrack.wav
    python3 scripts/mix.py --no-slow      # intro/outro soft but at normal speed

Music: public/audio/music/mere-paas-aao.mp3 ("Mere Paas Aao Mere Dosto"), cut
per the edit in src/timeline.ts — mostly 0:43–0:57, 1:18–1:36 where needed,
soft and slowed at the start and the end. Segments marked `stem: 'instrumental'`
are cut from mere-paas-aao.instrumental.wav (python3 scripts/separate.py), so
the vocals are only heard in the opening seconds.

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
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = RNG.standard_normal(n)
    shape = np.sin(np.pi * t) ** 2
    freqs = (400 + 2600 * np.sin(np.pi * t) ** 1.5) if not rising else (300 * (20 ** t))
    x = sweep_filter(noise, 'band', freqs, q=1.1)[0] * shape
    x = normalize(x)
    pans = pan + (t - 0.5) * 0.6
    return np.stack([x * np.cos((pans + 1) * np.pi / 4), x * np.sin((pans + 1) * np.pi / 4)])


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
}

# Per-type level (dB) before each cue's own trim.
LEVEL = {
    'click': -8, 'tick': -20, 'key': -17, 'keyHeavy': -9, 'whoosh': -16, 'whooshLong': -15,
    'impact': -3, 'impactSoft': -7, 'riser': -12, 'pop': -16, 'blip': -12, 'glitch': -16,
    'thump': -6, 'boing': -16, 'scan': -12, 'shimmer': -18, 'rumble': -6, 'haki': -2,
    'scratch': -18, 'hit': -9,
}
REVERB_SEND = {'tick': 0.25, 'click': 0.12, 'pop': 0.2, 'whoosh': 0.2, 'key': 0.06, 'keyHeavy': 0.18, 'blip': 0.2, 'haki': 0.18}


# ---------------------------------------------------------------- music

def music_segment(song: np.ndarray, seg: dict, slow: bool) -> np.ndarray:
    """Cut, (optionally) slow, filter, fade, reverb and level one piece of the edit."""
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
    if seg.get('tapeStop'):
        # Turntable wind-down after `to`: speed falls 1× → 0 over `tapeStop` seconds.
        d = int(seg['tapeStop'] * SR)
        b = a + int(span * SR)
        src = song[:, b:b + d]
        speed = (1 - np.linspace(0, 1, d)) ** 1.6
        pos = np.cumsum(speed)
        wound = np.stack([np.interp(pos, np.arange(src.shape[1]), ch) for ch in src])
        wound *= np.linspace(1, 0.08, d) ** 1.5
        x = np.concatenate([x, filt(wound, 'low', 3200)], axis=1)
        n = x.shape[1]
    fi, fo = int(seg['fadeIn'] * SR), int(seg['fadeOut'] * SR)
    if fi:
        x[:, :fi] *= np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    if fo:
        x[:, n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    if seg.get('reverb'):
        x = reverb(x, seg['reverb'])[:, : n + int(1.6 * SR)]
    return x * db(seg['gain'])


def main():
    slow = '--no-slow' not in sys.argv
    data = json.loads((ROOT / 'out/cues.json').read_text())
    length = int((data['duration'] + 0.5) * SR)
    music_bus = np.zeros((2, length), dtype=np.float64)
    sfx_bus = np.zeros((2, length), dtype=np.float64)
    send_bus = np.zeros((2, length), dtype=np.float64)

    song_path = ROOT / 'public/audio/music/mere-paas-aao.mp3'
    if song_path.exists():
        stems = {'mix': song_path}
        if any(seg.get('stem') for seg in data['music']):
            stems['instrumental'] = song_path.with_name(song_path.stem + '.instrumental.wav')
            if not stems['instrumental'].exists():
                sys.exit(f'! {stems["instrumental"].name} missing — run: python3 scripts/separate.py')
        sources = {}
        for name, path in stems.items():
            x = decode(path).astype(np.float64)
            # Each take at the same loudness over the hook (0:43–0:57.5), so segment
            # gains mean the same thing whichever take a segment is cut from.
            sources[name] = x * (db(-16) / rms(x[:, int(43 * SR):int(57.5 * SR)]))
        for seg in data['music']:
            place(music_bus, music_segment(sources[seg.get('stem', 'mix')], seg, slow), seg['at'])
    else:
        print('! music not found — mixing sound design only')

    for cue in [c for c in data['cues'] if c['type'] == 'duck']:
        a, b = int(cue['t'] * SR), int((cue['t'] + cue['dur']) * SR)
        ramp = int(0.12 * SR)
        curve = np.ones(length)
        depth = db(cue['gain'])
        curve[a:b] = depth
        curve[max(0, a - ramp):a] = np.linspace(1, depth, a - max(0, a - ramp))
        curve[b:b + ramp] = np.linspace(depth, 1, len(curve[b:b + ramp]))
        music_bus *= curve

    for cue in data['cues']:
        if cue['type'] == 'duck':
            continue
        clip = FACTORY[cue['type']](cue)
        gain = db(LEVEL[cue['type']] + cue.get('gain', 0))
        place(sfx_bus, clip, cue['t'], gain)
        if cue['type'] in REVERB_SEND:
            place(send_bus, clip, cue['t'], gain * REVERB_SEND[cue['type']])

    wet = signal.fftconvolve(send_bus, IR, axes=-1)[:, :length] * 0.6
    mix = music_bus + sfx_bus + wet

    # Gentle bus glue + safety: soft clip, then peak-normalize to -1 dBFS.
    mix = np.tanh(mix * 1.25) / np.tanh(1.25)
    mix = normalize(mix, db(-1.0))
    # Short fade at the very end.
    tail = int(0.25 * SR)
    mix[:, -tail:] *= np.linspace(1, 0, tail)

    out = ROOT / ('public/audio/soundtrack.wav' if slow else 'public/audio/soundtrack-noslow.wav')
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    import wave
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    loud = 20 * np.log10(rms(mix))
    print(f'{out.relative_to(ROOT)} — {length / SR:.2f}s, RMS {loud:.1f} dBFS, peak -1 dBFS')


if __name__ == '__main__':
    main()
