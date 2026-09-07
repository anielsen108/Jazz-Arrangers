/** Stable, readable desk URLs, including the three original study IDs. */
export function deskSlug(id: string): string {
  return ({ sebesky: 'don-sebesky', nestico: 'sammy-nestico', evans: 'gil-evans' } as Record<string, string>)[id] ?? id;
}

export function normalizeArtistSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function initializeDeskSearch(): void {
  const picker = document.querySelector<HTMLDetailsElement>('[data-desk-picker]');
  if (!picker) return;
  const input = picker.querySelector<HTMLInputElement>('[data-desk-search]')!;
  const clear = picker.querySelector<HTMLButtonElement>('[data-desk-clear]')!;
  const list = picker.querySelector<HTMLElement>('[data-desk-artists]')!;
  const rows = [...list.querySelectorAll<HTMLLIElement>('[data-desk-artist]')];
  const status = picker.querySelector<HTMLElement>('[data-desk-count]')!;
  const empty = picker.querySelector<HTMLElement>('[data-desk-empty]')!;
  const active = list.querySelector<HTMLAnchorElement>('[aria-current="page"]');
  const visibleLinks = () => rows.filter((row) => !row.hidden).map((row) => row.querySelector<HTMLAnchorElement>('a')!);
  const filter = () => {
    const query = normalizeArtistSearch(input.value);
    const currentUrl = new URL(location.href);
    if (input.value.trim()) currentUrl.searchParams.set('q', input.value.trim());
    else currentUrl.searchParams.delete('q');
    if (currentUrl.href !== location.href) history.replaceState(history.state, '', currentUrl);
    for (const row of rows) {
      row.hidden = !normalizeArtistSearch(row.dataset.deskArtist ?? '').includes(query);
      const link = row.querySelector<HTMLAnchorElement>('a')!;
      const url = new URL(link.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim());
      else url.searchParams.delete('q');
      link.href = url.href;
    }
    const count = visibleLinks().length;
    status.textContent = query ? `${count} matching artist${count === 1 ? '' : 's'}` : `${rows.length} artists · A–Z`;
    empty.hidden = count > 0;
    clear.hidden = !input.value;
    list.scrollTop = 0;
  };
  input.disabled = false;
  input.value = new URL(location.href).searchParams.get('q') ?? '';
  filter();
  if (!input.value && active) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 2);
  input.addEventListener('input', filter);
  const reset = () => { input.value = ''; filter(); input.focus(); };
  clear.addEventListener('click', reset);
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
