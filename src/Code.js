function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Calendar Entries by Role')
    // HtmlService strips <meta> from the file, so the viewport has to
    // be declared here. Without it phones lay the page out at ~980px
    // and scale the result down, which is why it reads so small.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


/**
 * Get every calendar entry the current user is involved in that was
 * created within the given date range, tagged with the user's role.
 *
 * Both roles are always returned; the client filters them by checkbox
 * so that toggling a role does not search the calendar again.
 *
 * @param {string} startDateString - 'yyyy-MM-dd'
 * @param {string} endDateString   - 'yyyy-MM-dd'
 */
function getEntriesInRange(startDateString, endDateString) {
  const calendarId = 'primary';
  const timezone = Session.getScriptTimeZone();


  if (!startDateString || !endDateString) {
    throw new Error(
      'Please select both a start and an end date.'
    );
  }


  // Start date 00:00
  const rangeStart = parseDateInTimezone(
    startDateString,
    timezone
  );

  // Day after the end date 00:00 (exclusive)
  const rangeEndExclusive = parseDateInTimezone(
    endDateString,
    timezone
  );

  rangeEndExclusive.setDate(
    rangeEndExclusive.getDate() + 1
  );


  if (rangeStart >= rangeEndExclusive) {
    throw new Error(
      'Start date must be on or before end date.'
    );
  }


  let pageToken;
  const events = [];

  do {
    const response = Calendar.Events.list(calendarId, {
      // An event is always updated at or after it was created,
      // so this is a safe prefilter for "created on/after rangeStart".
      updatedMin: rangeStart.toISOString(),
      showDeleted: false,
      singleEvents: false,
      maxResults: 2500,
      pageToken: pageToken
    });

    if (response.items) {
      events.push(...response.items);
    }

    pageToken = response.nextPageToken;

  } while (pageToken);


  const matched = [];

  events.forEach(event => {

    if (!event.created) return;

    const created = new Date(event.created);

    const createdInRange =
      created >= rangeStart &&
      created < rangeEndExclusive;

    if (!createdInRange) return;


    const role = roleOf(event);

    if (!role) return;


    matched.push({ event: event, role: role });
  });


  // Sort by creation time
  matched.sort((a, b) => {
    return new Date(a.event.created) - new Date(b.event.created);
  });


  return matched.map(entry => {

    const event = entry.event;

    let eventStart = '';

    if (event.start && event.start.dateTime) {
      eventStart = formatDate(
        new Date(event.start.dateTime),
        timezone
      );
    } else if (event.start && event.start.date) {
      eventStart = event.start.date;
    }


    // Split attendees into rooms/resources and guests
    const rooms = [];
    const guests = [];

    if (event.attendees) {
      event.attendees.forEach(attendee => {

        const isResource =
          attendee.resource === true ||
          (
            attendee.email &&
            attendee.email.includes('resource')
          );

        const label =
          attendee.displayName ||
          attendee.email;

        if (isResource) {
          rooms.push(label);
        } else {
          guests.push(label);
        }

      });
    }


    // Who set this up (useful for entries the user was invited to)
    let organizer = '';

    if (event.organizer && event.organizer.self !== true) {
      organizer =
        event.organizer.displayName ||
        event.organizer.email ||
        '';
    }


    return {
      title: event.summary || '(No title)',

      role: entry.role,

      created: formatDate(
        new Date(event.created),
        timezone
      ),

      start: eventStart,

      url: event.htmlLink || '',

      organizer: organizer,

      rooms: rooms,

      guests: guests
    };
  });
}


/**
 * Classify how the current user is involved in an event.
 *
 * Returns 'created' when the user created it, 'invited' when someone
 * else did and the user is on the guest list, or '' when neither.
 * The two are kept mutually exclusive so that checking both boxes
 * lists every entry exactly once.
 */
function roleOf(event) {

  const createdByMe =
    event.creator &&
    event.creator.self === true;

  if (createdByMe) return 'created';


  const attendees = event.attendees || [];

  const isAttendee = attendees.some(attendee => {
    return attendee.self === true;
  });

  if (isAttendee) return 'invited';


  return '';
}


/**
 * Parse a 'yyyy-MM-dd' string as midnight in the given timezone.
 * The UTC offset is derived from the date itself rather than
 * hard-coded, so the range stays correct for any date.
 */
function parseDateInTimezone(dateString, timezone) {
  const probe = new Date(`${dateString}T12:00:00Z`);

  const offset = Utilities.formatDate(
    probe,
    timezone,
    'XXX'
  );

  return new Date(`${dateString}T00:00:00${offset}`);
}


function formatDate(date, timezone) {
  return Utilities.formatDate(
    date,
    timezone,
    'yyyy/MM/dd HH:mm'
  );
}
