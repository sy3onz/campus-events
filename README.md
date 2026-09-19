# Campus Pass — School Event Management System

> **Recent updates (latest):** the color palette was changed again, this
> time to an olive/rifle-green scheme on a cream background (Rifle Green
> `#283618`, Olive Drab `#606C38`, Cream `#FEFAE0`), with a single
> burnt-orange accent kept for alerts/destructive actions since the three
> requested colors alone don't leave room for a distinct danger color.
>
> **Recent updates (prior round):** the Audit Log can now be sorted (by
> when, who, action, or target — click a column heading or use the sort
> dropdown); the two "Announcements" sidebar links are now distinct
> ("Announcements" = the feed everyone reads, "Manage Announcements" =
> the faculty/admin posting screen, with its own icon); course/strand
> multi-pickers (event audience restrictions, announcement audience) are
> now checkbox grids instead of native multi-selects, so unselecting a
> course no longer requires Ctrl/Cmd-click; **users, events,
> registrations, announcements, notifications, bulk-register templates
> and the audit log are now stored as separate tables** in `localStorage`
> instead of one shared blob, so a reset or change to one never touches
> the others (existing single-blob saves are migrated automatically);
> events can now be marked **"Registrations require organizer
> approval,"** which puts new self-registrations and faculty
> bulk-registrations into **Pending** status until an admin reviews them
> (admin-issued tickets are still approved immediately); **bulk
> registration now supports multiple activities within the main event
> and optionally registering the same class roster into other events in
> the same pass**; activity/session cards on the event detail page are
> now **clickable for faculty and admins only**, jumping straight to that
> event's registrants list (students never see who else registered, and
> faculty get read-only access — no status changes or manual add); bulk
> registration now **checks each typed name against existing accounts**
> and clearly flags unmatched names as "No account found," asking for
> confirmation before registering them as explicit no-account/guest
> entries instead of silently folding them into the class (this also
> fixes a bug where unmatched students were previously mis-attributed to
> the registering teacher's own account); and the whole visual palette
> was changed to an earth-tone system — Café Noir, Kombu Green, Moss
> Green, Tan and Bone.
>
> **Earlier round:** Signup now collects First/Middle/Last
> name separately (with a "no middle name" checkbox); Student ID numbers
> follow a 00-00-0000 format with auto-formatting as you type; accounts can
> be **deactivated** from Manage Users (blocks login) and reactivated;
> profile or password changes now notify the user via the notification
> bell **and** a simulated confirmation email; every account and
> registration change — including guests who never had an account — is
> now recorded in a new **Audit Log** (Admin); announcements can target
> Everyone, Staff/admins only, or specific courses/strands, and can carry
> an expiry date; **faculty can now post announcements** of their own;
> a registrant's course/strand shown to admins is pulled live from their
> account instead of frozen at registration time; bulk registration
> classes can be **saved as a template** and reloaded for a future event,
> already-entered names drop off the suggestion list, and **admins can
> bulk-register too**, attributing the class to a chosen teacher; any
> registration can be edited within 24 hours of being created; check-in's
> "too early" message now reads plainly ("it's not time for this event
> yet"); the duplicate password-reveal icon some browsers were drawing
> alongside our own has been suppressed; status dropdowns are now
> color-coded; and small transitions/hover states were added throughout
> for polish.
>
> **Earlier round:** Student ID required at signup with duplicate
> checking; Department/College replaced by a Course dropdown (college) or
> Strand + Grade Level (Senior High); event eligibility restrictable by
> role/course/year/grade level; admin ticket-issuing bypass for
> guests/outsiders/accountless students; Account Settings for
> email/password changes; Browse Events grouped by month; check-in
> Active/Checked-in/Cancelled tabs and a "too early" block; inline
> mandatory-field warnings on auth forms.


A single, centralized platform for creating, publishing, and managing every
school event (Anniversary, Intramurals, Job Fair, Recognition Day, Christmas
Party, and any future event) instead of juggling separate spreadsheets and
Google Forms.

This is a **fully functional working prototype** — every feature below runs
for real in your browser. There is no separate server to install: user
accounts, events, registrations, tickets, check-ins, and announcements are
all stored in your browser's `localStorage`, so the app behaves like a real
multi-user system across every page of the app (open it in an incognito
window to start with a fresh demo dataset).

---

## How to run it

1. Unzip the folder.
2. Double-click `index.html` — **or**, for the smoothest experience (some
   browsers restrict local files), run a tiny local server from inside the
   folder:
   ```bash
   python3 -m http.server 8080
   ```
   then open `http://localhost:8080` in your browser.
3. Log in with one of the demo accounts below, or create a new account.

An internet connection is used only to load Google Fonts and three small
libraries (QR code rendering, PDF export) from a public CDN — everything
else works fully offline.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin / Organizer | admin@school.edu | admin123 |
| Faculty Adviser | rcruz@school.edu | faculty123 |
| Student | maria.santos@school.edu | student123 |
| Alumni / Guest | john.delacruz@alumni.school.edu | alumni123 |

You can also tap **Create account** to sign up as a new student, faculty
member, or alumni/guest.

---

## Problem it solves

Schools run many events a year, each usually tracked with its own paper
form, spreadsheet, or Google Form. That causes inconsistent data, duplicate
effort, inaccurate headcounts, and no unified attendance history. Campus
Pass gives organizers one system to create and run *any* event, and gives
students, faculty and alumni one place to find, register for, and track
every event they attend.

---

## Functional requirements — coverage

| Requirement | Where it lives |
|---|---|
| Account registration/login (email-based) | `Create account` / `Log in` screen |
| Event Management Module (create/edit/publish/archive) | Admin → Manage Events |
| Event listing page (browse upcoming/ongoing/past) | Browse Events, with status + category filters and search |
| Event registration form, per event | Event detail page → **Register** |
| Activity/session selection within an event | Registration modal — checkboxes per activity (e.g. Anniversary → Sports Fest / Cultural Program / Food Fair) |
| Registration capacity limits & deadlines per activity | Enforced when opening the registration form; shown live on the event page |
| Confirmation notification after registering | Toast + entry in the notification bell + digital ticket |
| QR code / digital ticket generation | "My Registrations" → **View ticket** (QR + downloadable PDF pass) |
| Attendance tracking (QR / manual check-in) | Admin → Check-in Console (scan-style code entry **and** manual name lookup) |
| "My Registrations" dashboard | My Registrations — full history across every event |
| Admin dashboard (approve/reject, real-time headcounts) | Admin → Dashboard, and per-event Registrations page |
| Search & filter registrants (event, department, activity, status) | Admin → Event → Registrations toolbar |
| Export attendance/reports (Excel-compatible CSV & PDF) | Registrations page → **CSV** / **PDF** buttons |
| Announcements/notifications | Announcements feed (all users) + Admin → Announcements (post/delete) + notification bell |
| Role-based visibility (year level/department/role, alumni) | Set per-event in the event editor's "Who can register" section; enforced on the event page |
| Bulk registration (faculty registering a class) | Faculty-only "Bulk register my class" button on eligible event pages |

## Non-functional requirements

- **Simple, minimal-step flows** — browsing, filtering and registering all
  happen in a couple of clicks; forms default sensibly and validate inline.
- **Responsive** — the layout collapses to a single column and a slide-out
  nav drawer under ~760px width; every card, table and modal is usable on a
  phone.
- **Fast** — everything runs client-side against an in-memory/localStorage
  store, so there's no network round-trip for normal use.
- **Secure-by-design pattern (prototype-level)** — session and account data
  are namespaced in `localStorage`; a production build would swap this data
  layer for a real authenticated API without touching any view code, since
  all data access already goes through the single `Store` module.
- **Scalable to new events** — creating a new event never requires new code;
  the same event model supports any number of activities, capacities, and
  audience rules.

---

## Design notes

The visual language is built around the one physical object every user
actually holds: an event ticket. Every event, registration and digital pass
is rendered as a **ticket stub card** — a perforated divider between the
event's details and a torn-off corner showing its code — instead of generic
dashboard cards. Deep Rifle Green + Olive Drab, on a Cream background, is used throughout to keep the
"official pass" feel consistent from the events list to the printable PDF
ticket. Headings use Fraunces (a display serif with the weight of a printed
program), body text uses Inter, and every ticket code, ID, and data table
uses IBM Plex Mono to read like real credential/ticket data.

---

## Project structure

```
index.html              Entry point / app shell
css/style.css            Full design system (tokens, components, responsive rules)
js/store.js               localStorage data layer + seed data (users, events, registrations…)
js/utils.js                Formatting, toasts, modals, CSV/PDF export, eligibility rules
js/router.js               Minimal hash-based router
js/components.js           Shared UI: app shell/nav, ticket card, icons
js/view.auth.js            Login / account creation
js/view.events.js          Browse events, event detail, registration + bulk registration
js/view.registrations.js   "My Registrations" + digital ticket / QR pass
js/view.announcements.js   Announcement feed
js/view.admin.js           Admin dashboard, event management, registrations, check-in, announcements
js/app.js                  Bootstraps routes and global interactions
```

## Resetting the demo data

Open the browser console on the app and run:
```js
Store.reset()
```
then refresh the page, to wipe all local changes and restore the original
seeded events and accounts.
