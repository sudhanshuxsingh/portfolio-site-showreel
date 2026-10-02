"""
Replace frame ranges of a finished render with re-rendered segments, frame-accurately,
so a fix to one scene doesn't need a full 80-minute re-render.

    npx remotion render Showreel out/seg-press.mp4 --frames=3564-3695 --muted
    python3 scripts/splice.py out/showreel-video.mp4 out/seg-press.mp4:3564 [...more]

Writes the result over the input (the original is kept as *.orig.mp4).
"""
import shutil
import subprocess
import sys
from pathlib import Path


def frames(path: str) -> int:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0',
         '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return int(out)


def main():
    base = Path(sys.argv[1])
    segments = sorted(((int(spec.rsplit(':', 1)[1]), spec.rsplit(':', 1)[0]) for spec in sys.argv[2:]))
    total = frames(str(base))
    original = base.with_suffix('.orig.mp4')
    if not original.exists():
        shutil.copy(base, original)

    inputs = ['-i', str(original)]
    parts = []
    graph = []
    cursor = 0
    for index, (start, path) in enumerate(segments, start=1):
        length = frames(path)
        if start > cursor:
            graph.append(f'[0:v]trim=start_frame={cursor}:end_frame={start},setpts=PTS-STARTPTS[p{len(parts)}]')
            parts.append(f'[p{len(parts)}]')
        inputs += ['-i', path]
        graph.append(f'[{index}:v]setpts=PTS-STARTPTS[p{len(parts)}]')
        parts.append(f'[p{len(parts)}]')
        cursor = start + length
        print(f'  replace f{start}–f{cursor - 1} with {path} ({length} frames)')
    if cursor < total:
        graph.append(f'[0:v]trim=start_frame={cursor},setpts=PTS-STARTPTS[p{len(parts)}]')
        parts.append(f'[p{len(parts)}]')
    graph.append(f'{"".join(parts)}concat=n={len(parts)}:v=1:a=0[v]')

    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(graph), '-map', '[v]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '60',
         '-movflags', '+faststart', str(base)],
        check=True,
    )
    result = frames(str(base))
    print(f'{base}: {result} frames (was {total})')
    if result != total:
        sys.exit('frame count changed — check segment lengths')


if __name__ == '__main__':
    main()
