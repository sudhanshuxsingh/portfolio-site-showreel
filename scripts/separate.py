"""
Splits the song into instrumental and vocals with UVR's MDX-Net "Inst HQ 3" model,
so the reel can drop the vocals after the opening seconds.

    python3 scripts/separate.py [song.mp3] [model.onnx]

Model: https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx
(downloaded to .cache/ on first run). Writes, next to the song:
    <name>.instrumental.wav   <name>.vocals.wav   (44.1 kHz stereo, same timeline)

This is UVR's MDX demix loop re-implemented in numpy + onnxruntime (no PyTorch):
STFT n_fft 6144 / hop 1024 / periodic Hann, the first 3072 bins in, chunks of
256 frames with 25 % overlap, Hann-weighted overlap-add, ×1.022 compensation.
"""
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
N_FFT = 6144
HOP = 1024
DIM_F = 3072
DIM_T = 256
COMPENSATE = 1.022
OVERLAP = 0.25
MODEL_URL = (
    'https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/'
    'UVR-MDX-NET-Inst_HQ_3.onnx'
)

WINDOW = (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N_FFT) / N_FFT)).astype(np.float32)  # periodic Hann
TRIM = N_FFT // 2
CHUNK = HOP * (DIM_T - 1)


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()


def write_wav(path: Path, audio: np.ndarray):
    pcm = (np.clip(audio, -1, 1).T * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def stft(chunk: np.ndarray) -> np.ndarray:
    """[2, CHUNK] → model layout [4, DIM_F, DIM_T] = (L re, L im, R re, R im)."""
    padded = np.pad(chunk, ((0, 0), (N_FFT // 2, N_FFT // 2)), mode='reflect')
    index = np.arange(N_FFT)[None, :] + HOP * np.arange(DIM_T)[:, None]
    spec = np.fft.rfft(padded[:, index] * WINDOW, axis=-1).transpose(0, 2, 1)  # [2, bins, frames]
    spec = np.stack([spec.real, spec.imag], axis=1).reshape(4, -1, DIM_T)
    return spec[:, :DIM_F, :].astype(np.float32)


def istft(spec: np.ndarray) -> np.ndarray:
    """Model layout [4, DIM_F, DIM_T] → [2, CHUNK] (torch.istft, center=True)."""
    bins = N_FFT // 2 + 1
    full = np.zeros((4, bins, DIM_T), dtype=np.float32)
    full[:, :DIM_F] = spec
    full = full.reshape(2, 2, bins, DIM_T)
    complex_spec = (full[:, 0] + 1j * full[:, 1]).transpose(0, 2, 1)  # [2, frames, bins]
    frames = np.fft.irfft(complex_spec, n=N_FFT, axis=-1) * WINDOW
    length = N_FFT + HOP * (DIM_T - 1)
    out = np.zeros((2, length), dtype=np.float64)
    norm = np.zeros(length, dtype=np.float64)
    for t in range(DIM_T):
        out[:, t * HOP:t * HOP + N_FFT] += frames[:, t]
        norm[t * HOP:t * HOP + N_FFT] += WINDOW ** 2
    out /= np.maximum(norm, 1e-8)
    return out[:, N_FFT // 2:N_FFT // 2 + CHUNK].astype(np.float32)


def separate(mix: np.ndarray, session: ort.InferenceSession) -> np.ndarray:
    """Returns the instrumental, sample-aligned with `mix`."""
    gen = CHUNK - 2 * TRIM
    pad = gen + TRIM - (mix.shape[-1] % gen)
    mixture = np.concatenate([np.zeros((2, TRIM), np.float32), mix, np.zeros((2, pad), np.float32)], 1)
    step = int((1 - OVERLAP) * CHUNK)
    result = np.zeros_like(mixture)
    divider = np.zeros_like(mixture)
    starts = list(range(0, mixture.shape[-1], step))
    for n, start in enumerate(starts, 1):
        end = min(start + CHUNK, mixture.shape[-1])
        part = mixture[:, start:end]
        if part.shape[-1] < CHUNK:
            part = np.pad(part, ((0, 0), (0, CHUNK - part.shape[-1])))
        spec = stft(part)
        spec[:, :3, :] = 0
        predicted = session.run(None, {'input': spec[None]})[0][0]
        wave_ = istft(predicted)[:, : end - start]
        window = np.hanning(end - start)[None, :]
        result[:, start:end] += wave_ * window
        divider[:, start:end] += window
        print(f'\r  chunk {n}/{len(starts)}', end='', flush=True)
    print()
    out = (result / np.maximum(divider, 1e-8))[:, TRIM:TRIM + mix.shape[-1]]
    return out * COMPENSATE


def main():
    song = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public/audio/music/mere-paas-aao.mp3'
    model = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / '.cache/UVR-MDX-NET-Inst_HQ_3.onnx'
    if not model.exists():
        model.parent.mkdir(parents=True, exist_ok=True)
        print(f'downloading {MODEL_URL}')
        urllib.request.urlretrieve(MODEL_URL, model)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(model), options, providers=['CPUExecutionProvider'])
    mix = decode(song)
    print(f'{song.name}: {mix.shape[1] / SR:.1f}s')
    instrumental = separate(mix, session)
    vocals = mix - instrumental
    stem = song.with_suffix('')
    write_wav(stem.with_name(stem.name + '.instrumental.wav'), instrumental)
    write_wav(stem.with_name(stem.name + '.vocals.wav'), vocals)
    print('wrote', stem.name + '.instrumental.wav', 'and', stem.name + '.vocals.wav')


if __name__ == '__main__':
    main()
