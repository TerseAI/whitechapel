export function lanternBriefingStaging() {
  const hale = [.7, 0, -1.8];
  const reed = [-.8, 0, -.1];
  const ellis = [-.1, 0, 1.05];
  return {
    camera: { position: [3.8, 2.15, 2.8], target: [-.05, 1.42, -.3] },
    actors: [
      { id: 'hale', position: hale, heading: heading(hale, [-.45, 0, .475]) },
      { id: 'reed', position: reed, heading: heading(reed, hale) - .12 },
      { id: 'ellis', position: ellis, heading: heading(ellis, hale) - .22 },
    ],
  };
}

function heading(from, to) { return Math.atan2(to[0] - from[0], to[2] - from[2]); }
