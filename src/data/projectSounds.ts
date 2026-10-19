export interface ProjectVoice {
  type: OscillatorType;
  frequency: number;
  endFrequency?: number;
  delay?: number;
  duration: number;
  gain: number;
  attack?: number;
}

// Eight contrasting, short audition sounds. Labels identify the option for feedback.
export const projectSounds: { en: string; es: string; voices: ProjectVoice[] }[] = [
  {
    en: 'Soft bubble',
    es: 'Burbuja suave',
    voices: [{ type: 'sine', frequency: 660, endFrequency: 330, duration: 0.16, gain: 0.038 }],
  },
  {
    en: 'Glass chime',
    es: 'Cristal',
    voices: [
      { type: 'sine', frequency: 1046.5, duration: 0.24, gain: 0.023 },
      { type: 'sine', frequency: 1568, delay: 0.018, duration: 0.2, gain: 0.011 },
    ],
  },
  {
    en: 'Wooden tap',
    es: 'Toque de madera',
    voices: [{ type: 'triangle', frequency: 240, endFrequency: 160, duration: 0.075, gain: 0.04 }],
  },
  {
    en: 'Rising synth',
    es: 'Sintetizador ascendente',
    voices: [
      { type: 'triangle', frequency: 330, endFrequency: 660, duration: 0.14, gain: 0.023 },
      { type: 'sine', frequency: 880, delay: 0.085, duration: 0.1, gain: 0.018 },
    ],
  },
  {
    en: 'Warm pluck',
    es: 'Cuerda cálida',
    voices: [
      { type: 'sine', frequency: 392, endFrequency: 380, duration: 0.2, gain: 0.032 },
      { type: 'triangle', frequency: 784, duration: 0.08, gain: 0.01 },
    ],
  },
  {
    en: 'Arcade blip',
    es: 'Sonido arcade',
    voices: [
      { type: 'square', frequency: 783.99, duration: 0.045, gain: 0.009 },
      { type: 'square', frequency: 1046.5, delay: 0.055, duration: 0.055, gain: 0.008 },
    ],
  },
  {
    en: 'Airy sweep',
    es: 'Barrido suave',
    voices: [
      {
        type: 'sine',
        frequency: 520,
        endFrequency: 1040,
        duration: 0.18,
        gain: 0.02,
        attack: 0.045,
      },
      {
        type: 'triangle',
        frequency: 1040,
        endFrequency: 880,
        delay: 0.04,
        duration: 0.12,
        gain: 0.012,
        attack: 0.035,
      },
    ],
  },
  {
    en: 'Tiny bell',
    es: 'Campanilla',
    voices: [
      { type: 'sine', frequency: 880, duration: 0.28, gain: 0.025 },
      { type: 'sine', frequency: 1760, duration: 0.16, gain: 0.008 },
    ],
  },
];
