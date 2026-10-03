# Guild events

Staff with the `owner` or `site_mod` role manage events in **Admin → Events**.
The form supports a title, game (including a custom game), description, image,
color, visibility, and either a single date or one or more weekly days. Time
controls use the event’s selected IANA time zone; public and admin list cards use
the viewer’s zone. The editor preview uses the selected schedule zone.

The existing `public.site_content` row with `section = 'events'` stores:

```json
{
  "version": 2,
  "items": [
    {
      "id": "stable event ID",
      "title": "Guild Raid",
      "game": "RF Online Next",
      "description": "Boss Progression • Guild Run",
      "image": "raid",
      "color": "red",
      "enabled": true,
      "schedule": {"kind": "weekly", "days": [0], "time": "19:00", "timeZone": "America/Chicago"}
    }
  ]
}
```

A one-time schedule uses `{"kind":"once","date":"2026-10-04","time":"19:00","timeZone":"Asia/Manila"}`.
Weekday values are Sunday 0 through Saturday 6 in the selected schedule zone.
Schedules without a `timeZone` retain `America/Chicago`. Time-zone choices include
common regions and the browser’s supported IANA zone list; named zones follow
daylight-saving rules for the event date rather than a fixed UTC offset. Legacy `raid`, `expedition`, and
`elysium` schedules, including strings such as `7:00 PM CT`, are read without a
migration. The first event save writes `items` while retaining legacy properties.
An empty `items` array is authoritative and never restores default events.

`events.v1.js` contains the shared catalogs, next-occurrence calculation, validation,
and card renderer. Add future approved image choices to `IMAGES` and place their
files in `assets/thumbnails/`. Add color choices to `COLORS`. The five initial image
choices reuse the existing raid, expedition, Elysium, battlefield, and city art.

Upcoming visible events sort by their next start, with stable order for ties.
The hero shows the first three; View All shows the full upcoming list. Past
one-time events and hidden events remain available in admin. Public pages refresh
content and sorting once a minute while visible, and when the tab becomes visible.
During a daylight-saving overlap the first occurrence is used. Nonexistent
one-time wall times are rejected; a weekly occurrence in a spring gap is skipped.

Event saves update just the events row, return the saved row, and compare
`updated_at` to prevent silently overwriting another staff member's changes.
Unrelated site-content saves never write the events row. Existing database RLS
allows public reads and restricts content writes to owners and site moderators.

Run schedule tests with `node --test tests/events.test.cjs`.
