#!/usr/bin/env bash
# Mux the rendered picture with the mixed soundtrack into the final deliverables.
#   out/showreel.mp4      master: the render's H.264 stream untouched + AAC 320k
#   out/showreel-web.mp4  smaller re-encode for sharing and embedding
set -euo pipefail
cd "$(dirname "$0")/.."
video=out/showreel-video.mp4
audio=${1:-public/audio/soundtrack.wav}
[ -f "$audio" ] || audio=public/audio/soundtrack.m4a
ffmpeg -v error -y -i "$video" -i "$audio" -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/showreel.mp4
ffmpeg -v error -y -i out/showreel.mp4 -map 0 \
  -c:v libx264 -preset medium -crf 24 -maxrate 6M -bufsize 12M -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart out/showreel-web.mp4
ls -lh out/showreel.mp4 out/showreel-web.mp4
