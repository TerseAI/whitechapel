export function generatedVoiceUrl(clip: string): string | null {
  return clip.length <= 4096 && /^https:\/\/(?:[a-z0-9-]+\.)*fal\.media\/[^\s\\]*$/i.test(clip) ? clip : null;
}
