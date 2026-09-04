import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const board = read('src/features/editorial/EventsBoardScreen.tsx');
const detail = read('app/events/[id].tsx');
const data = read('src/features/events/eventDiscoveryData.ts');
const tickets = read('src/lib/eventTickets.ts');
const services = read('src/features/culture/mobileServices.ts');
const content = read('src/lib/mobileContent.ts');

for (const field of ['slug', 'city', 'venue_id', 'lineup_headline', 'genre_tags', 'event_tags', 'ticket_url', 'commerce_classification', 'occurrence_status']) {
  assert.match(data, new RegExp(field), `public Events select must include ${field}`);
  assert.match(content, new RegExp(field), `EventItem must expose ${field}`);
}
assert.match(services, /select\('id,slug,title,description,cover_image_url,location,city,venue_id,lineup_headline,genre_tags,event_tags,starts_at/, 'event detail must load the same real discovery identity fields');

assert.match(board, /accessibilityLabel="Search events, lineups, venues and cities"/, 'Events must expose an owned native search field');
assert.match(board, /accessibilityLabel=\{filtersOpen \? 'Hide event search and filters' : 'Open event search and filters'\}/, 'the progressive discovery control must name search and filters semantically');
assert.match(board, />Search\{activeFilterCount \? ` · \$\{activeFilterCount\}` : ''\}<\/Text>/, 'the collapsed progressive-disclosure control must visibly lead with Search and retain active-count truth');
assert.match(board, /const \[filtersOpen, setFiltersOpen\] = useState\(false\)/, 'event search and filters must remain closed by default');
assert.match(board, /accessibilityLabel="Back to Events"[\s\S]*setMode\('browse'\)[\s\S]*<EventsMap/, 'Map must expose an immediate return to Browse above its canvas');
assert.match(board, /event\.lineup_headline[\s\S]*event\.city[\s\S]*event\.location[\s\S]*event\.genre_tags[\s\S]*event\.event_tags/, 'Events search must cover lineup, city, location, genres and tags');
for (const state of ['dateFilter', 'cityFilter', 'genreFilter', 'filtersOpen', 'activeFilterCount']) {
  assert.match(board, new RegExp(state), `Events filters must wire ${state}`);
}
for (const label of ['Tonight', 'This week', 'Weekend', 'All cities', 'All genres']) {
  assert.match(board, new RegExp(label, 'i'), `Events filters must expose ${label}`);
}
assert.match(board, /function FilterDropdownField[\s\S]*accessibilityState=\{\{ expanded: open, selected: value !== 'all' \}\}/, 'compact Event filters must expose accessible dropdown state');
assert.match(board, /function FilterDropdownMenu[\s\S]*accessibilityRole="radio"[\s\S]*setOpenFilterDropdown\(null\)/, 'the open Event dropdown must expose one selected option and close after selection');
assert.match(board, /new Set\(filterSourceEvents\.map\(\(event\) => event\.city\?\.trim\(\)\)[\s\S]*localeCompare/, 'City dropdown choices must derive from every unique non-empty eligible event city');
assert.match(board, /filterDropdownRow[\s\S]*eventFilterDropdowns\.map[\s\S]*FilterDropdownField/, 'When, City and Genre must share one compact dropdown row');
assert.doesNotMatch(board, /function FilterChoiceRail/, 'the oversized horizontal choice rails must not return');
assert.match(
  board,
  /useEffect\(\(\) => setBoardLimit\(8\), \[category, cityFilter, dateFilter, experienceMode, genreFilter, query, takeoverCategory, takeoverGroup\]\)/,
  'the compact Event Board must reset to eight when search, mode or filters change',
);
assert.match(board, /No events match[\s\S]*Clear filters/, 'zero results must remain explicit and recoverable');

assert.match(tickets, /classification === 'physical'[\s\S]*classification === 'unclassified'[\s\S]*classification == null/, 'legacy real-world events must retain organiser ticket links');
assert.match(tickets, /!event\.stream_url[\s\S]*!event\.playback_url/, 'external event tickets must reject stream/playback access');
assert.match(tickets, /url\.protocol !== 'https:'[\s\S]*isBlockedTicketHost/, 'ticket URLs must remain HTTPS and local-host safe');
assert.match(tickets, /BLOCKED_HOST_SUFFIXES[\s\S]*\.localhost[\s\S]*\.local[\s\S]*\.internal[\s\S]*\.home\.arpa/, 'ticket URLs must reject local network suffixes');
assert.match(tickets, /first === 10[\s\S]*first === 127[\s\S]*first === 169[\s\S]*first === 172[\s\S]*first === 192[\s\S]*first >= 224/, 'ticket URLs must reject private, link-local and reserved IPv4 literals');
assert.match(tickets, /mappedIpv4[\s\S]*\^\(\?:fc\|fd\)[\s\S]*\^fe\[89ab\]/, 'ticket URLs must reject mapped, unique-local and link-local IPv6 literals');
assert.match(board, /function BrowseFastList[\s\S]*fastThumbWrap[\s\S]*fullDateLine\(event\)[\s\S]*venueLine\(event\)[\s\S]*viewPill/, 'compact event rows must use artwork, one date/location stack and the accepted View action');
assert.doesNotMatch(board, /events_fast_list/, 'the accepted compact row must open detail instead of restoring the old inline ticket action');
assert.match(board, /Open ticket link[\s\S]*on \$\{provider\}/, 'spotlight ticket-link accessibility must identify the external provider');
assert.match(board, /posterFooterStatus[\s\S]*hasEligibleExternalTickets\(event\) \? 'Tickets live' : 'Ticket link pending'/, 'artwork rail status must remain truthful and route through detail');

assert.match(detail, /Share\.share/, 'event detail must expose a native share action');
assert.match(detail, /HeroTicketAction event=\{event\}/, 'event detail must expose tickets in the artwork hero');
assert.match(detail, /DATE AND TIME[\s\S]*LOCATION/, 'event detail must expose a scannable date and location hierarchy');
assert.match(detail, /lineup_headline[\s\S]*genre_tags[\s\S]*event_tags/, 'event detail must render real lineup and tag context');
for (const preserved of ['EventTicketPurchase', 'setEventRsvp', 'scheduleEventLocalReminder', 'MobileStoriesRail', 'Start a community thread', 'Open linked ticket']) {
  assert.match(detail, new RegExp(preserved), `event detail must preserve ${preserved}`);
}

console.log('mobile Events discovery and ticketing contract verified');
