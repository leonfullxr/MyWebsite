import { projectSounds } from '../data/projectSounds';

// Original, short synthesized UI tones; no audio downloads or autoplay prompts.
let enabled = true;
try {
  // A fresh opt-out key makes older trial settings unable to mute the default.
  enabled = localStorage.getItem('site-sounds-v2') !== 'off';
} catch {}
let audio: AudioContext | null = null;
let lastHover = 0;
const voices = new Set<OscillatorNode>();
const projectVoices = new Set<OscillatorNode>();
const es = document.documentElement.lang === 'es';

function syncSound() {
  document.documentElement.dataset.sound = enabled ? 'on' : 'off';
  const ready = audio?.state === 'running';
  document.documentElement.dataset.soundState = !enabled ? 'muted' : ready ? 'ready' : 'pending';
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((button) => {
    const label = enabled
      ? es
        ? 'Silenciar sonidos'
        : 'Mute sounds'
      : es
        ? 'Activar sonidos'
        : 'Enable sounds';
    button.setAttribute('aria-label', label);
    button.setAttribute(
      'title',
      enabled && !ready
        ? es
          ? 'Sonidos activados: haz clic en cualquier lugar para escucharlos. Pulsa para silenciar.'
          : 'Sounds on: click anywhere to start listening. Press to mute.'
        : label
    );
    button.setAttribute('aria-pressed', String(!enabled));
  });
}
function syncTheme() {
  const dark = document.documentElement.classList.contains('dark');
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const label = dark
      ? es
        ? 'Usar tema claro'
        : 'Use light theme'
      : es
        ? 'Usar tema oscuro'
        : 'Use dark theme';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(dark));
  });
}
async function unlockAudio() {
  if (!enabled) return;
  try {
    if (!audio || audio.state === 'closed') {
      audio = new AudioContext();
      audio.addEventListener('statechange', syncSound);
    }
    syncSound();
    if (audio.state !== 'running') await audio.resume();
    syncSound();
  } catch {
    /* A browser without audio support still has fully working controls. */
  }
}
type SoundKind = 'hover' | 'click' | 'enable' | 'skill' | 'certificate' | 'link';
function tone(kind: SoundKind, note = 0) {
  if (!enabled || audio?.state !== 'running') return;
  const now = audio.currentTime;
  const scale = [523.25, 587.33, 659.25, 783.99, 880];
  const skillNote = scale[Math.abs(note) % scale.length];
  const notes =
    kind === 'link'
      ? [739.99, 932.33]
      : kind === 'skill'
        ? [skillNote]
        : kind === 'certificate'
          ? [659.25, 987.77, 1318.51]
          : kind === 'enable'
            ? [523.25, 783.99]
            : kind === 'click'
              ? [440, 660]
              : [640];
  notes.forEach((frequency, i) => {
    const oscillator = audio!.createOscillator();
    const gain = audio!.createGain();
    const start = now + i * (kind === 'certificate' ? 0.045 : kind === 'link' ? 0.012 : 0.025);
    const length =
      kind === 'certificate'
        ? 0.22
        : kind === 'link'
          ? 0.07
          : kind === 'skill'
            ? 0.12
            : kind === 'hover'
              ? 0.065
              : 0.11;
    oscillator.type = kind === 'skill' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency *
        (kind === 'hover'
          ? 1.12
          : kind === 'link'
            ? 1.02
            : kind === 'skill'
              ? 0.88
              : kind === 'certificate'
                ? 1
                : 0.97),
      start + length
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(
      kind === 'hover'
        ? 0.018
        : kind === 'link'
          ? 0.014
          : kind === 'skill'
            ? 0.025
            : kind === 'certificate'
              ? 0.017
              : 0.028,
      start + 0.006
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain);
    gain.connect(audio!.destination);
    voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(start + length + 0.01);
  });
}

// Project auditions replace one another, keeping comparisons free from stacked sounds.
function projectTone(_index: number) {
  if (!enabled || audio?.state !== 'running') return;
  projectVoices.forEach((voice) => {
    try {
      voice.stop();
    } catch {}
  });
  projectVoices.clear();
  // Keep every project hover consistent with the selected warm pluck.
  const preset = projectSounds[4];
  const now = audio.currentTime;
  preset.voices.forEach((voice) => {
    const oscillator = audio!.createOscillator();
    const gain = audio!.createGain();
    const start = now + (voice.delay ?? 0);
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, start);
    if (voice.endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(voice.endFrequency, start + voice.duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(voice.gain, start + (voice.attack ?? 0.005));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.duration);
    oscillator.connect(gain);
    gain.connect(audio!.destination);
    voices.add(oscillator);
    projectVoices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(oscillator);
      projectVoices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(start + voice.duration + 0.01);
  });
}

document.addEventListener(
  'pointerdown',
  () => {
    void unlockAudio();
  },
  { passive: true }
);
// Touch browsers may grant audio access only after the pointer is released.
document.addEventListener('pointerup', () => void unlockAudio(), { passive: true });
document.addEventListener('keydown', (event) => {
  if (['Enter', ' ', 'Tab'].includes(event.key)) void unlockAudio();
});
document.addEventListener('pointerover', (event) => {
  if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
  const project = event.target.closest<HTMLElement>('[data-project-sound]');
  if (project) {
    if (event.relatedTarget instanceof Node && project.contains(event.relatedTarget)) return;
    if (performance.now() - lastHover < 90) return;
    lastHover = performance.now();
    projectTone(Number(project.dataset.projectSound));
    return;
  }
  const target = event.target.closest('[data-ui-sound], a[href]');
  if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)))
    return;
  if (performance.now() - lastHover < 90) return;
  lastHover = performance.now();
  const kind = target.getAttribute('data-ui-sound');
  tone(
    kind === 'skill' || kind === 'certificate'
      ? kind
      : target.matches('a[href]')
        ? 'link'
        : 'hover',
    Number(target.getAttribute('data-sound-note')) || 0
  );
});
document.addEventListener('focusin', (event) => {
  if (event.target instanceof Element) {
    const project = event.target.closest<HTMLElement>('[data-project-sound]');
    if (project) {
      if (
        event.target.matches(':focus-visible') &&
        !(event.relatedTarget instanceof Node && project.contains(event.relatedTarget))
      )
        projectTone(Number(project.dataset.projectSound));
      return;
    }
  }
  if (
    event.target instanceof Element &&
    event.target.matches('[data-ui-sound]:focus-visible, a[href]:focus-visible')
  ) {
    const kind = event.target.getAttribute('data-ui-sound');
    tone(
      kind === 'skill' || kind === 'certificate'
        ? kind
        : event.target.matches('a[href]')
          ? 'link'
          : 'hover',
      Number(event.target.getAttribute('data-sound-note')) || 0
    );
  }
});
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const soundButton = event.target.closest('[data-sound-toggle]');
  if (soundButton) {
    enabled = !enabled;
    try {
      localStorage.setItem('site-sounds-v2', enabled ? 'on' : 'off');
    } catch {}
    syncSound();
    if (enabled) void unlockAudio().then(() => tone('enable'));
    else
      voices.forEach((voice) => {
        try {
          voice.stop();
        } catch {}
      });
    return;
  }
  // A click also covers keyboard/assistive activations without a pointerdown.
  void unlockAudio();
  if (event.target.closest('[data-theme-toggle]')) {
    const toggle = (window as Window & { toggleTheme?: () => void }).toggleTheme;
    toggle?.();
    syncTheme();
  }
  const projectPreview = event.target.closest<HTMLElement>('[data-project-sound-preview]');
  if (projectPreview) {
    void unlockAudio().then(() => projectTone(Number(projectPreview.dataset.projectSoundPreview)));
    return;
  }
  const preview = event.target.closest('[data-sound-preview]');
  if (preview) {
    const kind = preview.getAttribute('data-sound-preview') as SoundKind;
    void unlockAudio().then(() => tone(kind));
    return;
  }
  const target = event.target.closest('[data-ui-sound]');
  if (target) {
    const kind = target.getAttribute('data-ui-sound');
    void unlockAudio().then(() =>
      tone(
        kind === 'skill' || kind === 'certificate' ? kind : 'click',
        Number(target.getAttribute('data-sound-note')) || 0
      )
    );
  }
});
syncSound();
syncTheme();
// Start automatically on browsers that already permit audio for this site.
// Otherwise resume the same context on the first ordinary interaction.
void unlockAudio();

window.addEventListener('storage', (event) => {
  if (event.key === 'site-sounds-v2') {
    enabled = event.newValue !== 'off';
    if (!enabled)
      voices.forEach((voice) => {
        try {
          voice.stop();
        } catch {}
      });
    syncSound();
    if (enabled) void unlockAudio();
  }
  if (event.key === 'theme') {
    document.documentElement.classList.toggle('dark', event.newValue === 'dark');
    syncTheme();
  }
});
