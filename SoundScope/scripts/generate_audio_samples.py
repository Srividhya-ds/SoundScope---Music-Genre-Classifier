import os
import wave
import struct
import math
import random

SAMPLE_RATE = 22050  # GTZAN standard sample rate
DURATION = 15.0      # 15 seconds per sample track (GTZAN standard subset, light and fast)
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)
OUTPUT_DIR = r"C:\Users\srivi\.gemini\antigravity\scratch\SoundScope\assets\audio"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def clamp(val, min_val=-1.0, max_val=1.0):
    return max(min_val, min(max_val, val))

def generate_wave(samples, filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with wave.open(filepath, 'w') as wav:
        wav.setnchannels(1)  # Mono, GTZAN standard
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(SAMPLE_RATE)
        packed = bytearray()
        for s in samples:
            val = int(clamp(s) * 32767.0)
            packed.extend(struct.pack('<h', val))
        wav.writeframes(packed)
    print(f"Generated {filename}: {len(samples)} samples, {DURATION}s @ {SAMPLE_RATE}Hz")

def synth_blues():
    samples = [0.0] * NUM_SAMPLES
    bpm = 115.0
    sec_per_beat = 60.0 / bpm
    scale = [110.0, 130.8, 146.8, 155.6, 164.8, 196.0, 220.0, 261.6, 293.7, 329.6]
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        beat = (t / sec_per_beat) % 12.0
        # Walking shuffle bass
        note_idx = int(beat * 2) % len(scale)
        freq = scale[note_idx]
        bass = math.sin(2 * math.pi * freq * t) * 0.45 + 0.2 * math.sin(4 * math.pi * freq * t)
        # Guitar blues lick
        lick_freq = scale[(int(beat * 4) + 3) % len(scale)]
        guitar = math.sin(2 * math.pi * lick_freq * t) * math.exp(-3.0 * ((t % (sec_per_beat / 2)))) * 0.35
        # Shuffle drum hi-hat
        drum = 0.0
        beat_phase = (t / sec_per_beat) % 1.0
        if beat_phase < 0.08 or (0.60 < beat_phase < 0.68):
            drum = (random.random() * 2.0 - 1.0) * 0.15 * math.exp(-30.0 * (beat_phase % 0.5))
        # Tube warmth
        total = bass + guitar + drum
        samples[i] = math.tanh(total * 1.3) * 0.8
    return samples

def synth_classical():
    samples = [0.0] * NUM_SAMPLES
    chords = [
        [293.66, 349.23, 440.0, 587.33], # Dm
        [261.63, 329.63, 392.0, 523.25], # C
        [220.00, 277.18, 329.63, 440.0], # A
        [293.66, 349.23, 440.0, 587.33], # Dm
    ]
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        chord_idx = int(t / 3.75) % len(chords)
        notes = chords[chord_idx]
        val = 0.0
        # String counterpoint with natural vibrato
        vibrato = 1.0 + 0.015 * math.sin(2 * math.pi * 5.5 * t)
        for idx, freq in enumerate(notes):
            f = freq * vibrato
            env = 0.5 + 0.5 * math.sin(2 * math.pi * (0.25 + idx * 0.1) * t)
            tone = (math.sin(2 * math.pi * f * t) * 0.5 +
                    math.sin(4 * math.pi * f * t) * 0.25 +
                    math.sin(6 * math.pi * f * t) * 0.12)
            val += tone * env * 0.18
        samples[i] = val
    return samples

def synth_country():
    samples = [0.0] * NUM_SAMPLES
    bpm = 120.0
    sec_per_beat = 60.0 / bpm
    notes_g = [98.0, 146.8, 196.0, 246.9, 293.7, 392.0]
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        sub_beat = int((t / (sec_per_beat / 4))) % len(notes_g)
        freq = notes_g[sub_beat]
        pick_time = (t % (sec_per_beat / 4))
        pluck = math.sin(2 * math.pi * freq * t) * math.exp(-12.0 * pick_time) * 0.4
        pluck += math.sin(4 * math.pi * freq * t) * math.exp(-20.0 * pick_time) * 0.2
        # Train beat snare click
        beat_phase = (t / sec_per_beat) % 1.0
        click = 0.0
        if 0.45 < beat_phase < 0.55:
            click = (random.random() * 2.0 - 1.0) * math.exp(-40.0 * (beat_phase - 0.45)) * 0.2
        samples[i] = (pluck + click) * 0.85
    return samples

def synth_disco():
    samples = [0.0] * NUM_SAMPLES
    bpm = 124.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        beat_t = t % sec_per_beat
        # Four-on-the-floor punchy kick
        kick = 0.0
        if beat_t < 0.18:
            k_freq = 130.0 * math.exp(-22.0 * beat_t) + 45.0
            kick = math.sin(2 * math.pi * k_freq * beat_t) * math.exp(-14.0 * beat_t) * 0.7
        # Open Hi-Hat on upbeat
        hihat = 0.0
        upbeat_t = (t - sec_per_beat * 0.5) % sec_per_beat
        if 0.0 < upbeat_t < 0.2:
            hihat = (random.random() * 2.0 - 1.0) * math.exp(-18.0 * upbeat_t) * 0.22
        # Octave disco bassline
        bass_note = 110.0 if (int(t / (sec_per_beat / 2)) % 2 == 0) else 220.0
        bass = (math.sin(2 * math.pi * bass_note * t) + 0.3 * math.sin(4 * math.pi * bass_note * t)) * 0.3
        # String stab
        stab = 0.0
        if int(t / sec_per_beat) % 4 == 2 and beat_t < 0.35:
            stab = (math.sin(2 * math.pi * 523.25 * t) + math.sin(2 * math.pi * 659.25 * t)) * 0.25 * math.exp(-6.0 * beat_t)
        samples[i] = math.tanh((kick + hihat + bass + stab) * 1.1) * 0.85
    return samples

def synth_hiphop():
    samples = [0.0] * NUM_SAMPLES
    bpm = 92.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        bar_t = t % (sec_per_beat * 4)
        beat_num = bar_t / sec_per_beat
        # 808 Boom-Bap kick on 1 and 3.5
        kick = 0.0
        k_time = -1.0
        if beat_num < 0.5:
            k_time = bar_t
        elif 2.5 <= beat_num < 3.0:
            k_time = bar_t - 2.5 * sec_per_beat
        if 0 <= k_time < 0.4:
            f = 90.0 * math.exp(-12.0 * k_time) + 40.0
            kick = math.sin(2 * math.pi * f * k_time) * math.exp(-4.0 * k_time) * 0.8
        # Snare on 2 and 4
        snare = 0.0
        s_time = -1.0
        if 1.0 <= beat_num < 1.4:
            s_time = bar_t - 1.0 * sec_per_beat
        elif 3.0 <= beat_num < 3.4:
            s_time = bar_t - 3.0 * sec_per_beat
        if 0 <= s_time < 0.25:
            snare = ((random.random() * 2.0 - 1.0) * 0.4 + math.sin(2 * math.pi * 180.0 * s_time) * 0.3) * math.exp(-15.0 * s_time)
        # Minor Rhodes loop
        rhodes_f = 174.61 if (beat_num < 2) else 196.0
        rhodes = math.sin(2 * math.pi * rhodes_f * t) * 0.25 + math.sin(2 * math.pi * rhodes_f * 2 * t) * 0.1
        samples[i] = math.tanh((kick + snare + rhodes) * 1.2) * 0.85
    return samples

def synth_jazz():
    samples = [0.0] * NUM_SAMPLES
    bpm = 132.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        beat_phase = (t / sec_per_beat) % 1.0
        # Ride cymbal swing pattern
        cymbal = 0.0
        if beat_phase < 0.05 or (0.62 < beat_phase < 0.67):
            cymbal = (random.random() * 2.0 - 1.0) * math.exp(-25.0 * (beat_phase % 0.5)) * 0.2
        # Walking upright bass
        bass_notes = [87.31, 98.0, 110.0, 116.54, 130.81, 146.83, 164.81, 174.61]
        b_idx = int(t / sec_per_beat) % len(bass_notes)
        bf = bass_notes[b_idx]
        b_t = t % sec_per_beat
        bass = (math.sin(2 * math.pi * bf * t) + 0.3 * math.sin(4 * math.pi * bf * t)) * math.exp(-2.5 * b_t) * 0.4
        # Muted sax harmonic melody
        sax = math.sin(2 * math.pi * 349.23 * t) * 0.15 + math.sin(2 * math.pi * 523.25 * t) * 0.1
        samples[i] = (cymbal + bass + sax) * 0.8
    return samples

def synth_metal():
    samples = [0.0] * NUM_SAMPLES
    bpm = 145.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        # Double kick blasts (16th notes)
        kick_step = (t / (sec_per_beat / 4)) % 1.0
        kick = 0.0
        if kick_step < 0.2:
            kick = math.sin(2 * math.pi * (160.0 * math.exp(-30.0 * kick_step) + 50.0) * kick_step) * 0.5
        # Heavy distorted guitar drop-D palm mute
        riff_t = int(t / (sec_per_beat / 2)) % 4
        base_f = [73.42, 82.41, 73.42, 87.31][riff_t]
        raw_guitar = (math.sin(2 * math.pi * base_f * t) +
                      0.8 * math.sin(4 * math.pi * base_f * t) +
                      0.6 * math.sin(6 * math.pi * base_f * t) +
                      0.4 * math.sin(8 * math.pi * base_f * t))
        distorted = math.tanh(raw_guitar * 4.5) * 0.5
        # Snare crack on 2 and 4
        snare = 0.0
        beat_num = (t / sec_per_beat) % 2.0
        if 0.95 < beat_num < 1.15:
            snare = (random.random() * 2.0 - 1.0) * 0.35
        samples[i] = math.tanh((kick + distorted + snare) * 1.3) * 0.85
    return samples

def synth_pop():
    samples = [0.0] * NUM_SAMPLES
    bpm = 126.0
    sec_per_beat = 60.0 / bpm
    progression = [261.63, 392.0, 440.0, 349.23] # C - G - Am - F
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        bar_num = int(t / (sec_per_beat * 4)) % len(progression)
        root = progression[bar_num]
        beat_t = t % sec_per_beat
        # Bright dance kick
        kick = 0.0
        if beat_t < 0.15:
            kick = math.sin(2 * math.pi * 120.0 * math.exp(-20.0 * beat_t) * beat_t) * 0.6
        # Pop bright synth hook
        hook_step = int(t / (sec_per_beat / 2)) % 8
        melody_note = root * (1.0 + hook_step * 0.125)
        synth = (math.sin(2 * math.pi * melody_note * t) + 0.4 * math.sin(4 * math.pi * melody_note * t)) * 0.25
        # Handclap on 2 and 4
        clap = 0.0
        beat_idx = int(t / sec_per_beat) % 2
        if beat_idx == 1 and beat_t < 0.1:
            clap = (random.random() * 2.0 - 1.0) * 0.25
        samples[i] = (kick + synth + clap) * 0.8
    return samples

def synth_reggae():
    samples = [0.0] * NUM_SAMPLES
    bpm = 76.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        beat_phase = (t / sec_per_beat) % 1.0
        bar_beat = int((t / sec_per_beat)) % 4
        # One drop drum (kick + rimshot on beat 3)
        one_drop = 0.0
        if bar_beat == 2 and beat_phase < 0.2:
            one_drop = (math.sin(2 * math.pi * 70.0 * beat_phase) + (random.random() * 2.0 - 1.0) * 0.3) * math.exp(-12.0 * beat_phase) * 0.7
        # Guitar/organ skank on offbeats 2 and 4
        skank = 0.0
        if (bar_beat in [1, 3]) and 0.45 < beat_phase < 0.75:
            s_t = beat_phase - 0.45
            skank = (math.sin(2 * math.pi * 329.63 * t) + math.sin(2 * math.pi * 392.0 * t)) * math.exp(-18.0 * s_t) * 0.35
        # Deep dub bassline
        bass_f = 65.41 if (bar_beat < 2) else 73.42
        bass = math.sin(2 * math.pi * bass_f * t) * 0.45
        samples[i] = (one_drop + skank + bass) * 0.85
    return samples

def synth_rock():
    samples = [0.0] * NUM_SAMPLES
    bpm = 135.0
    sec_per_beat = 60.0 / bpm
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        beat_phase = (t / sec_per_beat) % 1.0
        bar_beat = int(t / sec_per_beat) % 4
        # Rock kick on 1 and 3
        kick = 0.0
        if bar_beat in [0, 2] and beat_phase < 0.18:
            kick = math.sin(2 * math.pi * (140.0 * math.exp(-22.0 * beat_phase) + 50.0) * beat_phase) * 0.65
        # Rock snare on 2 and 4
        snare = 0.0
        if bar_beat in [1, 3] and beat_phase < 0.22:
            snare = ((random.random() * 2.0 - 1.0) * 0.4 + math.sin(2 * math.pi * 200.0 * beat_phase) * 0.3) * math.exp(-14.0 * beat_phase)
        # Crunchy power chords
        chord_step = int(t / (sec_per_beat * 2)) % 3
        rf = [164.81, 196.0, 220.0][chord_step]
        guitar = math.sin(2 * math.pi * rf * t) + 0.6 * math.sin(3 * math.pi * rf * t)
        dist_guitar = math.tanh(guitar * 2.5) * 0.35
        samples[i] = (kick + snare + dist_guitar) * 0.85
    return samples

generators = {
    "blues.00000.wav": synth_blues,
    "classical.00000.wav": synth_classical,
    "country.00000.wav": synth_country,
    "disco.00000.wav": synth_disco,
    "hiphop.00000.wav": synth_hiphop,
    "jazz.00000.wav": synth_jazz,
    "metal.00000.wav": synth_metal,
    "pop.00000.wav": synth_pop,
    "reggae.00000.wav": synth_reggae,
    "rock.00000.wav": synth_rock
}

for fname, gen_func in generators.items():
    s = gen_func()
    generate_wave(s, fname)

print("All 10 GTZAN genre audio tracks successfully generated.")
