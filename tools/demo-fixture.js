// Demo / screenshot fixture. Replaces the Apps Script bridge with a
// fixed dataset, and filters it by the requested range exactly as
// getEntriesInRange does on the server -- so the presets and the date
// pickers genuinely change the result. Renders with no Google account
// and touches nobody's calendar. Not part of the app.

const pad = n => String(n).padStart(2, '0');

function dayShift(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function stamp(days, hh, mm) {
  const d = dayShift(days);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function fmt(d) {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDay(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Spread across the past ten days so different ranges return different
// results, with both roles on most days so the checkboxes bite too.
// [createdOffset, createdH, createdM, role, title, startOffset,
//  startH, startM | null for all-day, organizer, rooms, guests]
const FIXTURE = [
  [0, 8, 14, 'created', 'Team offsite', 21, null, null, '', ['Offsite — Harbour Room'],
    ['Alex Park', 'Sam Rivera', 'Jordan Lee', 'Morgan Diaz', 'Priya Nair']],
  [0, 9, 2, 'created', 'Deep work — no meetings', 1, 9, 0, '', [], []],
  [0, 11, 37, 'invited', 'Budget sign-off with finance', 8, 11, 0, 'Priya Nair', [],
    ['Priya Nair', 'You']],
  [0, 15, 20, 'created', '1:1 with Jordan', 2, 15, 30, '', ['Focus Room 3'], ['Jordan Lee']],

  [-1, 8, 5, 'created', 'Design review', 6, 9, 0, '', ['Meeting Room A'],
    ['Alex Park', 'Sam Rivera', 'Jordan Lee', 'Priya Nair']],
  [-1, 10, 48, 'invited', 'Vendor onboarding call', 3, 17, 0, 'Morgan Diaz',
    ['Meeting Room B'], ['Morgan Diaz', 'Alex Park', 'You']],
  [-1, 16, 12, 'created', 'Quarterly planning', 12, 13, 30, '', ['Boardroom'],
    ['Jordan Lee', 'Alex Park']],

  [-2, 9, 30, 'created', 'Interview — backend candidate', 5, 10, 0, '', ['Meeting Room A'],
    ['Sam Rivera']],
  [-2, 14, 3, 'invited', 'All-hands', 4, 16, 0, 'Morgan Diaz', ['Auditorium'],
    ['Morgan Diaz', 'You']],

  [-3, 8, 55, 'created', 'Sprint retro', 1, 11, 0, '', ['Focus Room 3'],
    ['Alex Park', 'Sam Rivera']],
  [-3, 13, 41, 'created', 'Supplier check-in', 9, 14, 0, '', [], ['Priya Nair']],

  [-5, 10, 19, 'invited', 'Contract review with legal', 2, 9, 30, 'Priya Nair',
    ['Meeting Room B'], ['Priya Nair', 'Jordan Lee', 'You']],

  [-6, 17, 8, 'created', 'Board pack preparation', 16, null, null, '', [], []],

  [-9, 9, 12, 'created', 'Annual leave', 30, null, null, '', [], []]
];

const SAMPLE = FIXTURE.map(row => {
  const [cd, ch, cm, role, title, sd, sh, sm, organizer, rooms, guests] = row;
  const created = stamp(cd, ch, cm);
  return {
    created_: created,
    title: title,
    role: role,
    created: fmt(created),
    start: sh === null ? isoDay(dayShift(sd)) : fmt(stamp(sd, sh, sm)),
    url: '#',
    organizer: organizer,
    rooms: rooms,
    guests: guests
  };
});

window.google = { script: { run: {
  withSuccessHandler(fn) { this._ok = fn; return this; },
  withFailureHandler(fn) { this._ng = fn; return this; },

  getEntriesInRange(start, end) {
    const ok = this._ok;

    // Same window the server uses: start of the first day up to the
    // start of the day after the last one.
    const from = new Date(`${start}T00:00:00`);
    const to = new Date(`${end}T00:00:00`);
    to.setDate(to.getDate() + 1);

    const hits = SAMPLE
      .filter(e => e.created_ >= from && e.created_ < to)
      .sort((a, b) => a.created_ - b.created_)
      .map(({ created_, ...rest }) => rest);

    setTimeout(() => ok(hits), 200);
  }
} } };
