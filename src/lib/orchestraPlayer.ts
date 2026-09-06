import { CHORDS, MELODY, octave, chordDegree, displayPitch, soundingNotes, type Treatment } from './orchestraMusic';
import { OrchestraAudio, type LoopMode } from './orchestraAudio';
import { makeMidi, makeMusicXml, measureSvg } from './orchestraScore';

class OrchestrationPlayer extends HTMLElement {
  private engine = new OrchestraAudio();
  private treatment!: Treatment;
  private muted = new Set<string>();
  private solo = new Set<string>();
  private beat = 0;
  private tempo = 104;
  private loop: LoopMode = 'off';
  private loading = false;
  private request = 0;
  private lastBar = -1;
  private lastSnapshot = -1;
  private cleanups = new AbortController();
  private initialized = false;

  private el<T extends HTMLElement = HTMLElement>(selector: string) { return this.querySelector<T>(selector)!; }
  private all<T extends HTMLElement = HTMLElement>(selector: string) { return [...this.querySelectorAll<T>(selector)]; }
  private text(selector: string, text: string) { this.el(selector).textContent = text; }

  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    const data = this.querySelector<HTMLScriptElement>('[data-treatment]')?.textContent;
    if (!data) throw new Error('This page is missing its orchestration study.');
    this.treatment = JSON.parse(data) as Treatment;
    if (this.treatment.id !== this.dataset.style) throw new Error('The orchestration study does not match this page.');
    this.all<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('[disabled]').forEach((el) => el.disabled = false);
    this.addEventListener('click', this.handleClick);
    this.el<HTMLSelectElement>('[data-score-part]').addEventListener('change', () => this.renderScore());
    this.el<HTMLSelectElement>('[data-loop]').addEventListener('change', (event) => {
      this.loop = (event.target as HTMLSelectElement).value as LoopMode;
      this.restartAt(this.beat);
    });
    this.el<HTMLInputElement>('[data-tempo]').addEventListener('input', (event) => {
      this.text('[data-tempo-value]', (event.target as HTMLInputElement).value);
    });
    this.el<HTMLInputElement>('[data-tempo]').addEventListener('change', (event) => {
      this.tempo = Number((event.target as HTMLInputElement).value);
      this.restartAt(this.beat);
    });
    this.el<HTMLInputElement>('[data-volume]').addEventListener('input', (event) => this.engine.setVolume(Number((event.target as HTMLInputElement).value) / 100));
    this.el<HTMLInputElement>('[data-seek]').addEventListener('input', (event) => this.seek(Number((event.target as HTMLInputElement).value)));
    window.addEventListener('orchestration-start', (event) => {
      if ((event as CustomEvent).detail !== this) this.pause();
    }, { signal: this.cleanups.signal });
    window.addEventListener('pagehide', () => this.pause(), { signal: this.cleanups.signal });
    this.renderTreatment();
  }

  disconnectedCallback() { this.request++; this.engine.dispose(); this.cleanups.abort(); }

  private handleClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || !this.contains(button)) return;
    if (button.hasAttribute('data-play')) { this.loading || this.engine.playing ? this.pause() : void this.play(); return; }
    if (button.hasAttribute('data-restart')) { this.seek(0); return; }
    if (button.dataset.bar !== undefined) this.seek(Number(button.dataset.bar) * 4);
    else if (button.dataset.inspectBeat !== undefined) this.seek(Math.floor(this.beat / 4) * 4 + Number(button.dataset.inspectBeat));
    else if (button.dataset.mute) { this.toggle(this.muted, button.dataset.mute); this.updateMix(); }
    else if (button.dataset.solo) { this.toggle(this.solo, button.dataset.solo); this.updateMix(); }
    else if (button.hasAttribute('data-full')) { this.muted.clear(); this.solo.clear(); this.updateMix(); }
    else if (button.hasAttribute('data-melody')) {
      this.muted.clear();
      this.solo = new Set(this.treatment.melodyParts ?? (this.treatment.id === 'nestico' ? ['alto1', 'tpt1'] : [this.treatment.parts[0].id]));
      this.updateMix();
    } else if (button.hasAttribute('data-midi')) this.download(makeMidi(this.treatment, this.tempo), 'mid', 'audio/midi');
    else if (button.hasAttribute('data-musicxml')) this.download(makeMusicXml(this.treatment, this.tempo), 'musicxml', 'application/vnd.recordare.musicxml+xml');
  };

  private toggle(set: Set<string>, id: string) { set.has(id) ? set.delete(id) : set.add(id); }

  private status(message: string, error = false) {
    this.text('[data-status]', message);
    this.el('[data-status]').classList.toggle('orch-error', error);
  }

  private async play() {
    const request = ++this.request;
    window.dispatchEvent(new CustomEvent('orchestration-start', { detail: this }));
    this.loading = true;
    this.playButton('■ Cancel loading');
    this.status('Loading the ensemble’s instrument samples…');
    this.setAttribute('aria-busy', 'true');
    try {
      await this.engine.play({
        treatment: this.treatment, beat: this.beat, tempo: this.tempo, loop: this.loop,
        base: this.dataset.base ?? '', muted: this.muted, solo: this.solo,
        onReady: () => {
          if (request !== this.request) return;
          this.loading = false; this.setAttribute('aria-busy', 'false');
          this.playButton('Ⅱ Pause'); this.status(`Playing · ${this.treatment.name} · ${this.treatment.feel.toLowerCase()}.`);
        },
        onTick: (beat) => { this.beat = beat; this.updatePosition(); },
        onEnd: () => {
          this.beat = 0; this.loading = false; this.playButton('▶ Play again');
          this.status(`Passage complete · ${this.treatment.name}. Replay or solo parts to explore the arrangement.`);
          this.updatePosition();
        },
      });
    } catch (error) {
      if (request !== this.request) return;
      this.engine.stop(); this.loading = false; this.setAttribute('aria-busy', 'false');
      this.playButton('▶ Retry playback');
      this.status(`${error instanceof Error ? error.message : 'Audio could not start.'} Press Retry to try again.`, true);
    }
  }

  private playButton(text: string) { this.text('[data-play]', text); }

  private pause() {
    this.request++;
    if (this.engine.playing) this.beat = this.engine.beat;
    this.engine.stop(); this.loading = false;
    this.setAttribute('aria-busy', 'false');
    this.playButton(this.beat ? '▶ Resume' : '▶ Play passage');
    this.status('Paused. Select a bar or a beat to examine the score.');
    this.updatePosition();
  }

  private restartAt(beat: number) {
    const resume = this.engine.playing || this.loading;
    this.pause(); this.beat = beat; this.updatePosition();
    if (resume) void this.play();
  }

  private seek(beat: number) { this.restartAt(Math.max(0, Math.min(31.5, beat))); }

  private renderTreatment() {
    this.text('[data-feel]', this.treatment.feel);
    this.text('[data-treatment-description]', this.treatment.description);
    this.text('[data-part-count]', `${this.treatment.parts.length} parts`);
    const select = this.el<HTMLSelectElement>('[data-score-part]');
    select.replaceChildren(new Option('Melody · concert pitch', 'melody'), ...this.treatment.parts.map((part) => new Option(`${part.label} · concert pitch`, part.id)));
    const mixer = this.el('[data-mixer]');
    mixer.replaceChildren();
    for (const part of this.treatment.parts) {
      const row = document.createElement('div');
      row.className = `orch-part family-${part.family}`;
      row.dataset.part = part.id;
      const dot = document.createElement('span'); dot.className = 'orch-part-light'; dot.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('div');
      const label = document.createElement('strong'); label.textContent = part.label;
      const role = document.createElement('small'); role.textContent = part.role;
      copy.append(label, role);
      const mute = document.createElement('button'); mute.type = 'button'; mute.dataset.mute = part.id; mute.textContent = 'M'; mute.setAttribute('aria-label', `Mute ${part.label}`); mute.title = `Mute ${part.label}`;
      const solo = document.createElement('button'); solo.type = 'button'; solo.dataset.solo = part.id; solo.textContent = 'S'; solo.setAttribute('aria-label', `Solo ${part.label}`); solo.title = `Solo ${part.label}`;
      row.append(dot, copy, mute, solo); mixer.append(row);
    }
    this.renderScore(); this.lastBar = -1; this.lastSnapshot = -1;
    this.updateMix(); this.updatePosition();
  }

  private renderScore() {
    const id = this.el<HTMLSelectElement>('[data-score-part]').value;
    const part = this.treatment.parts.find((item) => item.id === id);
    const notes = part?.notes ?? MELODY.map((note) => ({ ...note, pitch: octave(note.pitch, this.treatment.melodyOctave ?? 0) }));
    this.all<HTMLButtonElement>('[data-bar]').forEach((button) => {
      button.innerHTML = measureSvg(notes, Number(button.dataset.bar), part?.clef ?? this.treatment.parts[0].clef, part?.label ?? 'Melody');
    });
    this.lastSnapshot = -1; this.updatePosition();
  }

  private audible(id: string) { return !this.muted.has(id) && (!this.solo.size || this.solo.has(id)); }

  private updateMix() {
    this.engine.mix(this.treatment.parts, this.muted, this.solo);
    this.all<HTMLButtonElement>('[data-mute]').forEach((button) => {
      const active = this.muted.has(button.dataset.mute!);
      const part = this.treatment.parts.find((p) => p.id === button.dataset.mute)!;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `${active ? 'Unmute' : 'Mute'} ${part.label}`);
    });
    this.all<HTMLButtonElement>('[data-solo]').forEach((button) => button.setAttribute('aria-pressed', String(this.solo.has(button.dataset.solo!))));
    this.all('[data-part]').forEach((row) => row.classList.toggle('inaudible', !this.audible(row.dataset.part!)));
    this.el('[data-full]').setAttribute('aria-pressed', String(!this.muted.size && !this.solo.size));
    this.updateNotes();
  }

  private updatePosition() {
    const bar = Math.min(7, Math.floor(this.beat / 4));
    const fraction = this.beat % 4;
    const beatLabel = `${Math.floor(fraction) + 1}${fraction % 1 >= 0.5 ? ' &' : ''}`;
    this.text('[data-position]', `Bar ${bar + 1} · beat ${beatLabel}`);
    this.text('[data-inspector-beat]', `Beat ${beatLabel}`);
    const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    this.text('[data-time]', `${format(this.beat * 60 / this.tempo)} / ${format(32 * 60 / this.tempo)}`);
    const seek = this.el<HTMLInputElement>('[data-seek]'); seek.value = String(this.beat); seek.setAttribute('aria-valuetext', `Bar ${bar + 1}, beat ${beatLabel}`);
    if (bar !== this.lastBar) {
      this.lastBar = bar;
      const annotation = this.treatment.annotations[bar];
      this.text('[data-bar-label]', `Bar ${String(bar + 1).padStart(2, '0')} · ${CHORDS[bar].function}`);
      this.text('[data-chord]', CHORDS[bar].symbol);
      for (const key of ['voicing', 'color', 'motion', 'listen'] as const) this.text(`[data-${key}]`, annotation[key]);
      this.all<HTMLButtonElement>('[data-bar]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.bar) === bar)));
    }
    const snapshot = Math.floor(this.beat * 16);
    if (snapshot !== this.lastSnapshot) {
      this.lastSnapshot = snapshot;
      this.all('[data-note-beat]').forEach((note) => note.classList.toggle('sounding', Number(note.dataset.noteBeat) <= this.beat && Number(note.dataset.noteEnd) > this.beat));
      this.all<HTMLButtonElement>('[data-inspect-beat]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.inspectBeat) === Math.floor(fraction * 2) / 2)));
      this.updateNotes();
    }
  }

  private updateNotes() {
    const notes = soundingNotes(this.treatment.parts, this.beat);
    const tbody = this.el('[data-notes]'); tbody.replaceChildren();
    notes.forEach(({ part, note }) => {
      const tr = document.createElement('tr');
      if (!this.audible(part.id)) tr.className = 'inaudible';
      for (const value of [part.label, displayPitch(note.pitch), chordDegree(note.pitch, Math.min(7, Math.floor(this.beat / 4)))]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      tbody.append(tr);
    });
    if (!notes.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 3; cell.textContent = 'Rest between attacks'; row.append(cell); tbody.append(row); }
    this.text('[data-sounding-count]', `${notes.filter(({ part }) => this.audible(part.id)).length} audible`);
    this.all('[data-part]').forEach((row) => row.classList.toggle('is-sounding', notes.some(({ part }) => part.id === row.dataset.part) && this.audible(row.dataset.part!)));
  }

  private download(data: string | Uint8Array, extension: string, type: string) {
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
    const link = document.createElement('a'); link.href = url; link.download = `small-hours-${this.treatment.id}.${extension}`;
    this.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.status(`${extension === 'mid' ? 'MIDI' : 'MusicXML score'} downloaded with all ${this.treatment.parts.length} parts.`);
  }
}

export function initializeOrchestrationPlayers() {
  if (!customElements.get('orchestration-player')) customElements.define('orchestration-player', OrchestrationPlayer);
}
