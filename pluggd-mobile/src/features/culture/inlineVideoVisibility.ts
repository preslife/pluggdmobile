export type VideoFrame = { id: string; y: number; height: number; preferred?: boolean };

export function chooseInlineVideo(frames: VideoFrame[], viewportHeight: number): string | null {
  const top = 100;
  const bottom = viewportHeight - 110;
  let winner: string | null = null;
  let best = -Infinity;
  for (const frame of frames) {
    if (!Number.isFinite(frame.y) || !Number.isFinite(frame.height) || frame.height <= 0) continue;
    const visible = Math.max(0, Math.min(frame.y + frame.height, bottom) - Math.max(frame.y, top));
    if (frame.preferred ? visible < Math.min(44, frame.height) : visible / frame.height < 0.65) continue;
    const score = (frame.preferred ? viewportHeight * 2 : 0) - Math.abs(frame.y + frame.height / 2 - (top + bottom) / 2);
    if (score > best) { best = score; winner = frame.id; }
  }
  return winner;
}
