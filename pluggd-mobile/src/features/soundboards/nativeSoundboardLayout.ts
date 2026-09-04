import type { SoundboardContentItem } from '../../lib/mobileContent';

export type NativeSoundboardItem = SoundboardContentItem & {
  creator_id?: string | null;
  metadata?: Record<string, unknown> | null;
  waveform_data?: unknown;
  allow_comments?: boolean | null;
  updated_at?: string | null;
};

export type NativeCanvasLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  fit: 'cover' | 'contain';
};

export type NativeDoodle =
  | {
      id: string;
      kind: 'stroke';
      color: string;
      width: number;
      opacity: number;
      points: Array<{ x: number; y: number }>;
    }
  | {
      id: string;
      kind: 'sticker';
      sticker: 'star' | 'arrow' | 'underline' | 'tape' | 'pin' | 'splash';
      color: string;
      width: number;
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };

export type NativeCanvasProjection = {
  width: number;
  height: number;
  layouts: Record<string, NativeCanvasLayout>;
  transformPoint: (point: { x: number; y: number }) => { x: number; y: number };
  contentScale: number;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type SourceEntry = {
  item: NativeSoundboardItem;
  layout: NativeCanvasLayout;
  centerX: number;
  centerY: number;
  bounds: Bounds;
};

const COLUMN_GAP = 12;
const ROW_GAP = 12;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number) => Math.round(value * 10) / 10;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finiteNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, min, max) : fallback;
};

const fallbackSize = (itemType: string) => {
  if (itemType === 'audio') return { width: 340, height: 190 };
  if (itemType === 'image' || itemType === 'video') return { width: 300, height: 300 };
  if (itemType === 'note') return { width: 270, height: 270 };
  return { width: 290, height: 220 };
};

export function resolveNativeCanvasLayout(item: NativeSoundboardItem, index: number): NativeCanvasLayout {
  const metadata = isRecord(item.metadata) ? item.metadata : {};
  const canvas = isRecord(metadata.canvas) ? metadata.canvas : {};
  const fallback = fallbackSize(item.item_type);
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: Math.round(finiteNumber(canvas.x, 48 + column * 370 + (row % 2 ? 36 : 0), -5000, 10000)),
    y: Math.round(finiteNumber(canvas.y, 48 + row * 340 + (column === 1 ? 24 : 0), -5000, 12000)),
    width: Math.round(finiteNumber(canvas.width, fallback.width, 120, 1600)),
    height: Math.round(finiteNumber(canvas.height, fallback.height, 80, 2000)),
    rotation: round(finiteNumber(canvas.rotation, (index % 3 - 1) * 1.8, -360, 360)),
    zIndex: Math.round(finiteNumber(canvas.zIndex, 10 + index, 0, 100000)),
    locked: typeof canvas.locked === 'boolean' ? canvas.locked : false,
    fit: canvas.fit === 'cover' ? 'cover' : 'contain',
  };
}

export function writeNativeCanvasLayout(
  metadata: Record<string, unknown> | null | undefined,
  layout: NativeCanvasLayout,
) {
  return {
    ...(isRecord(metadata) ? metadata : {}),
    canvas: {
      ...(isRecord(metadata?.canvas) ? metadata.canvas : {}),
      ...layout,
    },
  };
}

function rotatedBounds(centerX: number, centerY: number, width: number, height: number, rotation: number): Bounds {
  const radians = rotation * Math.PI / 180;
  const halfWidth = Math.abs(Math.cos(radians)) * width / 2 + Math.abs(Math.sin(radians)) * height / 2;
  const halfHeight = Math.abs(Math.sin(radians)) * width / 2 + Math.abs(Math.cos(radians)) * height / 2;
  return { minX: centerX - halfWidth, minY: centerY - halfHeight, maxX: centerX + halfWidth, maxY: centerY + halfHeight };
}

function mergeBounds(bounds: Bounds[]): Bounds {
  if (!bounds.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return bounds.reduce((result, entry) => ({
    minX: Math.min(result.minX, entry.minX),
    minY: Math.min(result.minY, entry.minY),
    maxX: Math.max(result.maxX, entry.maxX),
    maxY: Math.max(result.maxY, entry.maxY),
  }));
}

function median(values: number[]) {
  if (!values.length) return 1;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function sourceEntries(items: NativeSoundboardItem[]): SourceEntry[] {
  return items.map((item, index) => {
    const layout = resolveNativeCanvasLayout(item, index);
    const centerX = layout.x + layout.width / 2;
    const centerY = layout.y + layout.height / 2;
    return { item, layout, centerX, centerY, bounds: rotatedBounds(centerX, centerY, layout.width, layout.height, layout.rotation) };
  });
}

export function readNativeDoodles(metadata: Record<string, unknown> | null | undefined): NativeDoodle[] {
  const container = isRecord(metadata?.doodles) ? metadata.doodles : null;
  const elements = container && Array.isArray(container.elements) ? container.elements : [];
  return elements.flatMap((entry, index): NativeDoodle[] => {
    if (!isRecord(entry)) return [];
    const id = typeof entry.id === 'string' && entry.id ? entry.id : `doodle-${index}`;
    const color = typeof entry.color === 'string' ? entry.color : '#8b5cf6';
    const opacity = finiteNumber(entry.opacity, 1, 0.2, 1);
    if (entry.kind === 'stroke' && Array.isArray(entry.points)) {
      const points = entry.points.flatMap((point): Array<{ x: number; y: number }> => {
        if (!isRecord(point)) return [];
        const x = Number(point.x);
        const y = Number(point.y);
        return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
      });
      return points.length > 1 ? [{ id, kind: 'stroke', color, opacity, width: finiteNumber(entry.width, 5, 1, 36), points }] : [];
    }
    const stickers = ['star', 'arrow', 'underline', 'tape', 'pin', 'splash'] as const;
    if (entry.kind === 'sticker' && stickers.includes(entry.sticker as (typeof stickers)[number])) {
      return [{
        id,
        kind: 'sticker',
        sticker: entry.sticker as (typeof stickers)[number],
        color,
        opacity,
        width: finiteNumber(entry.width, 5, 1, 36),
        x: finiteNumber(entry.x, 0, -5000, 10000),
        y: finiteNumber(entry.y, 0, -5000, 10000),
        scale: finiteNumber(entry.scale, 1, 0.35, 3.5),
        rotation: finiteNumber(entry.rotation, 0, -180, 180),
      }];
    }
    return [];
  }).slice(0, 220);
}

export function fitNativeCanvas(items: NativeSoundboardItem[], viewportWidth: number, viewportHeight: number): NativeCanvasProjection {
  const width = Math.max(120, viewportWidth);
  const height = Math.max(120, viewportHeight);
  const entries = sourceEntries(items);
  const source = mergeBounds(entries.map((entry) => entry.bounds));
  const sourceWidth = Math.max(1, source.maxX - source.minX);
  const sourceHeight = Math.max(1, source.maxY - source.minY);
  const margin = 10;
  const scale = Math.min((width - margin * 2) / sourceWidth, (height - margin * 2) / sourceHeight);
  const offsetX = (width - sourceWidth * scale) / 2 - source.minX * scale;
  const offsetY = (height - sourceHeight * scale) / 2 - source.minY * scale;
  const layouts = Object.fromEntries(entries.map(({ item, layout }) => [item.id, {
    ...layout,
    x: round(layout.x * scale + offsetX),
    y: round(layout.y * scale + offsetY),
    width: round(layout.width * scale),
    height: round(layout.height * scale),
  }]));
  return {
    width,
    height,
    layouts,
    contentScale: scale,
    transformPoint: (point) => ({ x: round(point.x * scale + offsetX), y: round(point.y * scale + offsetY) }),
  };
}

export function projectNativeMobileTopology(items: NativeSoundboardItem[], viewportWidth: number): NativeCanvasProjection {
  const width = Math.max(280, Math.round(viewportWidth));
  const margin = 12;
  const innerWidth = width - margin * 2;
  const entries = sourceEntries(items);
  if (!entries.length) return { width, height: 180, layouts: {}, contentScale: 1, transformPoint: (point) => point };

  const sourceBounds = mergeBounds(entries.map((entry) => entry.bounds));
  const sourceWidth = Math.max(1, sourceBounds.maxX - sourceBounds.minX);
  const rowTolerance = Math.max(72, median(entries.map((entry) => entry.layout.height)) * 0.48);
  const rows: SourceEntry[][] = [];
  [...entries].sort((a, b) => a.centerY - b.centerY || a.centerX - b.centerX).forEach((entry) => {
    const row = rows.find((candidate) => {
      const center = candidate.reduce((sum, item) => sum + item.centerY, 0) / candidate.length;
      return Math.abs(entry.centerY - center) <= rowTolerance;
    });
    if (row) row.push(entry);
    else rows.push([entry]);
  });

  const projected = new Map<string, { source: SourceEntry; layout: NativeCanvasLayout; sourceScale: number }>();
  let cursorY = margin;
  rows.forEach((row) => {
    const ordered = [...row].sort((a, b) => a.centerX - b.centerX || a.item.id.localeCompare(b.item.id));
    const capacity = Math.max(1, (innerWidth - COLUMN_GAP * Math.max(0, ordered.length - 1)) / ordered.length);
    const scaled = ordered.map((entry) => {
      const media = entry.item.item_type === 'image' || entry.item.item_type === 'video';
      const desired = Math.min(entry.layout.width * 0.82, innerWidth * (media ? 0.8 : 0.72));
      let targetWidth = Math.min(desired, capacity);
      let targetHeight = entry.layout.height * targetWidth / Math.max(1, entry.layout.width);
      if (entry.item.item_type === 'note') targetHeight = clamp(targetHeight, targetWidth * 0.9, targetWidth * 1.05);
      const footprint = rotatedBounds(0, 0, targetWidth, targetHeight, entry.layout.rotation);
      const footprintWidth = footprint.maxX - footprint.minX;
      if (footprintWidth > capacity) {
        const fit = capacity / footprintWidth;
        targetWidth *= fit;
        targetHeight *= fit;
      }
      const finalFootprint = rotatedBounds(0, 0, targetWidth, targetHeight, entry.layout.rotation);
      return { entry, width: targetWidth, height: targetHeight, footprintWidth: finalFootprint.maxX - finalFootprint.minX, footprintHeight: finalFootprint.maxY - finalFootprint.minY };
    });
    const packedWidth = scaled.reduce((sum, entry) => sum + entry.footprintWidth, 0) + COLUMN_GAP * Math.max(0, scaled.length - 1);
    const rowSourceCenter = ordered.reduce((sum, entry) => sum + entry.centerX, 0) / ordered.length;
    const normalizedCenter = clamp((rowSourceCenter - sourceBounds.minX) / sourceWidth, 0, 1);
    const availableTravel = Math.max(0, innerWidth - packedWidth);
    let cursorX = margin + normalizedCenter * availableTravel;
    const rowHeight = Math.max(...scaled.map((entry) => entry.footprintHeight));
    scaled.forEach(({ entry, width: itemWidth, height: itemHeight, footprintWidth }) => {
      const centerX = cursorX + footprintWidth / 2;
      const centerY = cursorY + rowHeight / 2;
      projected.set(entry.item.id, {
        source: entry,
        sourceScale: itemWidth / Math.max(1, entry.layout.width),
        layout: {
          ...entry.layout,
          x: round(centerX - itemWidth / 2),
          y: round(centerY - itemHeight / 2),
          width: round(itemWidth),
          height: round(itemHeight),
        },
      });
      cursorX += footprintWidth + COLUMN_GAP;
    });
    cursorY += rowHeight + ROW_GAP;
  });

  const layouts = Object.fromEntries([...projected.entries()].map(([id, value]) => [id, value.layout]));
  const averageScale = median([...projected.values()].map((entry) => entry.sourceScale));
  const transformPoint = (point: { x: number; y: number }) => {
    const nearest = entries.reduce((result, entry) => {
      const distance = Math.hypot(point.x - entry.centerX, point.y - entry.centerY);
      return !result || distance < result.distance ? { entry, distance } : result;
    }, null as { entry: SourceEntry; distance: number } | null)?.entry ?? entries[0];
    const target = projected.get(nearest.item.id)!;
    return {
      x: round(target.layout.x + target.layout.width / 2 + (point.x - nearest.centerX) * target.sourceScale),
      y: round(target.layout.y + target.layout.height / 2 + (point.y - nearest.centerY) * target.sourceScale),
    };
  };
  return { width, height: Math.max(180, round(cursorY - ROW_GAP + margin)), layouts, contentScale: averageScale, transformPoint };
}
