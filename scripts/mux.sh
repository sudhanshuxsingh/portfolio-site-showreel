#!/usr/bin/env bash
# Mux the rendered picture with the mixed soundtrack into the final deliverables.
#   out/showreel.mp4      master: 1080×1920, 60 fps, H.264 High, AAC 320k
#   out/showreel-web.mp4  smaller copy for sharing/embedding
set -euo pipefail
cd "$(dirname "$0")/.."
video=out/showreel-video.mp4
audio=${1:-public/audio/soundtrack.wav}
[ -f "$audio" ] || audio=public/audio/soundtrack.m4a
ffmpeg -v error -y -i "$video" -i "$audio" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/showreel.mp4
ffmpeg -v error -y -i out/showreel.mp4 -map 0 \
  -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart out/showreel-web.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=nw=1 out/showreel.mp4
ls -lh out/showreel.mp4 out/showreel-web.mp4
