"""Find frames that disagree with both neighbours (stale compositor tiles, flashes).
   python3 scripts/dev/flicker.py video.mp4 [start_s end_s]"""
import subprocess, sys
import numpy as np
src = sys.argv[1]
W, H = 216, 384
args = ['ffmpeg', '-v', 'error']
if len(sys.argv) > 3:
    args += ['-ss', sys.argv[2], '-to', sys.argv[3]]
args += ['-i', src, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
proc = subprocess.Popen(args, stdout=subprocess.PIPE)
offset = float(sys.argv[2]) if len(sys.argv) > 3 else 0.0
frames = []
scores = []
n = 0
while True:
    buf = proc.stdout.read(W * H)
    if len(buf) < W * H:
        break
    frames.append(np.frombuffer(buf, np.uint8).astype(np.float32))
    if len(frames) == 3:
        a, b, c = frames
        mid = (a + c) / 2
        local = np.abs(b - mid)
        motion = np.abs(c - a) / 2
        # Pixels where the middle frame departs from both neighbours more than they differ.
        bad = (local > motion + 28) & (np.abs(b - a) > 28) & (np.abs(b - c) > 28)
        scores.append((n, bad.mean() * 100))
        frames.pop(0)
    n += 1
bad = [(i, s) for i, s in scores if s > 0.15]
print(f'frames scanned: {n}, flagged: {len(bad)}')
for i, s in bad:
    t = offset + i / 60
    print(f'  f{round(t * 60)} {t:6.2f}s  {s:.2f}% pixels')
