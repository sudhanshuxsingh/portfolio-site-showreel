"""Contact sheet of a video: python3 sheet.py in.mp4 out.png [cols] [times...] [--crop x:y:w:h] [--w 400]"""
import subprocess, sys, json, os, tempfile
from PIL import Image
args = sys.argv[1:]
crop = None; width = 400
if '--crop' in args:
    i = args.index('--crop'); crop = args[i+1]; del args[i:i+2]
if '--w' in args:
    i = args.index('--w'); width = int(args[i+1]); del args[i:i+2]
src, out, cols = args[0], args[1], int(args[2]) if len(args) > 2 else 4
times = [float(t) for t in args[3:]]
dur = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]).decode())
if not times:
    n = cols * 2
    times = [dur * (i + 0.5) / n for i in range(n)]
tiles = []
with tempfile.TemporaryDirectory() as d:
    for k, t in enumerate(times):
        p = os.path.join(d, f'{k}.png')
        vf = (f'crop={crop},' if crop else '') + f'scale={width}:-2'
        subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',src,'-frames:v','1','-vf',vf,'-y',p], check=True)
        tiles.append((t, Image.open(p).convert('RGB')))
w, h = tiles[0][1].size
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 18)), (60, 60, 60))
from PIL import ImageDraw
dr = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(tiles):
    x, y = (i % cols) * w, (i // cols) * (h + 18)
    sheet.paste(im, (x, y + 18)); dr.text((x + 4, y + 3), f'{t:.2f}s', fill=(255, 255, 0))
sheet.save(out); print(out, sheet.size)
