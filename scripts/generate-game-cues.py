"""Render original, softly struck tonal cues; paper foley is a separate CC0 recording."""
import math
import struct
import wave
from pathlib import Path

RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "frontend/public/audio/effects"


def render(name, notes, duration):
    samples = [0.0] * int(duration * RATE)
    for start, frequency, strength in notes:
        for index in range(int(start * RATE), len(samples)):
            time = index / RATE - start
            envelope = (1 - math.exp(-time * 160)) * math.exp(-time * 3.8)
            tone = sum(weight * math.sin(2 * math.pi * frequency * harmonic * time)
                       * math.exp(-time * harmonic * .65)
                       for harmonic, weight in [(1, 1), (2, .24), (3, .075)])
            samples[index] += tone * envelope * strength
    dry = samples[:]
    for delay, gain in [(.09, .13), (.17, .08), (.27, .04)]:
        offset = int(delay * RATE)
        for index in range(offset, len(samples)):
            samples[index] += dry[index - offset] * gain
    peak = max(abs(value) for value in samples)
    with wave.open(str(OUTPUT / name), "wb") as file:
        file.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(b"".join(struct.pack("<h", int(value / peak * 13500)) for value in samples))


OUTPUT.mkdir(parents=True, exist_ok=True)
render("lead-established.wav", [(0, 293.66, .8), (.12, 440, .55)], 1.1)
render("review-ready.wav", [(0, 293.66, .7), (.18, 349.23, .6), (.36, 440, .7)], 1.7)
render("chapter-complete.wav", [(0, 146.83, .6), (0, 293.66, .7), (.2, 349.23, .6),
                                (.4, 440, .6), (.7, 587.33, .75), (.7, 293.66, .35)], 2.8)
