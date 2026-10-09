export function boardLayout(count: number, width: number, height: number) {
  const dense = count > 12;
  const padding = width < 500 || dense ? 26 : 48;
  const gap = width < 500 || dense ? 26 : 58;
  const minimum = width < 500 ? 108 : dense ? 118 : 128;
  const capacity = Math.max(1, Math.min(5, Math.floor((width - padding * 2 + gap) / (minimum + gap))));
  const columns = Math.max(1, Math.min(capacity, Math.ceil(Math.sqrt(count * .9))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const paperWidth = Math.min(216, (width - padding * 2 - gap * (columns - 1)) / columns,
    Math.max(minimum, (height - padding * 2 - gap * (rows - 1) - 30) / rows / 1.4));
  const rowHeight = paperWidth * 1.4 + gap;
  const left = (width - columns * paperWidth - (columns - 1) * gap) / 2;
  return {
    height: Math.max(height, padding * 2 + rows * rowHeight - gap + 30),
    width: paperWidth,
    position: (index: number) => ({ x: left + index % columns * (paperWidth + gap), y: padding + Math.floor(index / columns) * rowHeight + (index % 3) * 7 }),
  };
}

export function paperAngle(id: string) {
  return (Array.from(id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 7 - 3) * .65;
}
