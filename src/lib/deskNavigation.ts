import { matchesDeskArtist, setDeskFilterParams, type DeskFilters } from './deskFilters';

/** Stable, readable desk URLs, including the three original study IDs. */
export function deskSlug(id: string): string {
  return ({ sebesky: 'don-sebesky', nestico: 'sammy-nestico', evans: 'gil-evans' } as Record<string, string>)[id] ?? id;
}

export function initializeDeskSearch(): void {
  const picker = document.querySelector<HTMLDetailsElement>('[data-desk-picker]');
  if (!picker) return;
  const input = picker.querySelector<HTMLInputElement>('[data-desk-search]')!;
  const clear = picker.querySelector<HTMLButtonElement>('[data-desk-clear]')!;
  const resetAll = picker.querySelector<HTMLButtonElement>('[data-desk-reset]')!;
  const selects = [...picker.querySelectorAll<HTMLSelectElement>('[data-desk-filter]')];
  const selectKeys = selects.map((select) => select.dataset.deskFilter as 'era' | 'size' | 'instrument');
  const optionLabels = new Map(selects.flatMap((select) => [...select.options].map((option) => [option, option.textContent ?? ''] as const)));
  const list = picker.querySelector<HTMLElement>('[data-desk-artists]')!;
  const rows = [...list.querySelectorAll<HTMLLIElement>('[data-desk-artist]')];
  const status = picker.querySelector<HTMLElement>('[data-desk-count]')!;
  const empty = picker.querySelector<HTMLElement>('[data-desk-empty]')!;
  const active = list.querySelector<HTMLAnchorElement>('[aria-current="page"]');
  const selectionNote = picker.querySelector<HTMLElement>('[data-desk-selection-note]')!;
  const filterSummary = picker.querySelector<HTMLElement>('[data-desk-filter-summary]')!;
  const entries = rows.map((row) => ({
    row, name: row.dataset.deskArtist ?? '', era: row.dataset.deskEra ?? '',
    size: row.dataset.deskSize ?? '', instruments: (row.dataset.deskInstruments ?? '').split(' '),
  }));
  const currentFilters = (): DeskFilters => ({
    q: input.value, era: selects[0].value, size: selects[1].value, instrument: selects[2].value,
  });
  const visibleLinks = () => rows.filter((row) => !row.hidden).map((row) => row.querySelector<HTMLAnchorElement>('a')!);
  const filter = () => {
    const filters = currentFilters();
    const isFiltered = Object.values(filters).some((value) => value.trim());
    const currentUrl = new URL(location.href);
    setDeskFilterParams(currentUrl, filters);
    if (currentUrl.href !== location.href) history.replaceState(history.state, '', currentUrl);
    for (const entry of entries) {
      const { row } = entry;
      row.hidden = !matchesDeskArtist(entry, filters);
      const link = row.querySelector<HTMLAnchorElement>('a')!;
      const url = new URL(link.href);
      setDeskFilterParams(url, filters);
      link.href = url.href;
    }
    // Each option counts matches with the other filters held in place.
    selects.forEach((select, index) => {
      for (const option of select.options) {
        const count = entries.filter((entry) => matchesDeskArtist(entry, { ...filters, [selectKeys[index]]: option.value })).length;
        option.textContent = `${optionLabels.get(option)} (${count})`;
        option.disabled = count === 0 && option.value !== '' && option.value !== select.value;
      }
      select.title = optionLabels.get(select.selectedOptions[0]) ?? '';
    });
    const count = visibleLinks().length;
    status.textContent = isFiltered ? `${count} matching artist${count === 1 ? '' : 's'}` : `${rows.length} artists · A–Z`;
    empty.hidden = count > 0;
    clear.hidden = !input.value;
    resetAll.hidden = !isFiltered;
    selectionNote.hidden = !active?.closest<HTMLLIElement>('li')?.hidden;
    filterSummary.hidden = !isFiltered;
    filterSummary.textContent = `${count} matching artist${count === 1 ? '' : 's'} · filters active`;
    list.scrollTop = 0;
  };
  input.disabled = false;
  const params = new URL(location.href).searchParams;
  input.value = params.get('q') ?? '';
  selects.forEach((select, index) => {
    const value = params.get(selectKeys[index]) ?? '';
    select.value = [...select.options].some((option) => option.value === value) ? value : '';
    select.disabled = false;
    select.addEventListener('change', filter);
  });
  filter();
  if (active && !active.closest<HTMLLIElement>('li')?.hidden) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 2);
  input.addEventListener('input', filter);
  const reset = () => { input.value = ''; filter(); input.focus(); };
  clear.addEventListener('click', reset);
  resetAll.addEventListener('click', () => {
    selects.forEach((select) => { select.value = ''; });
    reset();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); reset(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); visibleLinks()[0]?.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); visibleLinks()[0]?.click(); }
  });
  list.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const links = visibleLinks();
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current < 0) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : current + (event.key === 'ArrowDown' ? 1 : -1);
    links[Math.max(0, Math.min(links.length - 1, index))]?.focus();
  });
  // The selected artist stays visible while the mobile picker is folded away.
  if (matchMedia('(max-width: 54rem)').matches) picker.open = false;
}
