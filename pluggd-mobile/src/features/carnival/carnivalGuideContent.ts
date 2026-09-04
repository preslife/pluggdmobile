import type { CarnivalGuideContent, CarnivalStory } from './carnivalTypes';

const site = 'https://www.pluggd.fm';

export const CARNIVAL_STORY_FALLBACK: CarnivalStory[] = [
  ['notting-hill-carnival-2026-the-pluggd-guide', 'Notting Hill Carnival 2026: The PLUGGD Guide', 'The complete guide to three days of pan, mas, bass, food and freedom.', 'guide/carnival-portrait-2022.webp'],
  ['the-sound-systems-are-the-headliners', 'The Sound Systems Are the Headliners', 'Why the PA is the headline act at Carnival.', 'sound-system-setup.webp'],
  ['how-steelpan-opened-the-road', 'How Steelpan Opened the Road', 'The steel bands that helped make the road possible.', 'steelpan/steelpan-trinidad-carnival-2013.webp'],
  ['mas-bands-memory-and-the-art-of-playing-mas', 'Mas Bands, Memory and the Art of Playing Mas', 'Craft, character, memory and movement on the road.', 'mas/notting-hill-mas-2023.webp'],
  ['jouvert-before-the-road-wakes-up', 'J’ouvert: Before the Road Wakes Up', 'Paint, powder, pan and the freedom before daylight.', 'jouvert/3canal-jouvay-band-2024.webp'],
  ['what-to-eat-at-carnival', 'What to Eat at Carnival', 'Jerk smoke, roti, doubles, pepperpot and the cooks feeding the road.', 'food/notting-hill-jerk-queue-2015.webp'],
  ['the-pluggd-sound-system-map', 'The PLUGGD Sound System Map', 'The sourced 2026 roster sorted by sound, street and mood.', 'map/sound-system-build-2014.webp'],
  ['how-to-do-carnival-without-moving-like-a-tourist', 'How to Do Carnival Without Moving Like a Tourist', 'Move through a living Black British tradition with rhythm and respect.', 'etiquette/road-dance-2019-sedlecky.webp'],
].map(([slug, title, description, image]) => ({
  slug,
  title,
  description,
  imageUrl: `${site}/carnival-2026/assets/${image}`,
  articleUrl: `${site}/carnival-2026/${slug}.html`,
}));

const panoramaImage = 'https://pluggd.fm/carnival-2026/assets/steelpan/steelpan-trinidad-carnival-2013.webp';
const familyDayImage = 'https://pluggd.fm/carnival-2026/assets/jouvert/3canal-jouvay-band-2024.webp';
const adultsDayImage = 'https://pluggd.fm/carnival-2026/assets/mas/notting-hill-mas-2023.webp';

export function carnivalGuideStatus(now = new Date()): CarnivalGuideContent['status'] {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (day === '2026-08-29') return { label: 'Today · Saturday', title: 'Panorama opens the weekend', copy: 'Gates open at 4pm. Junior Panorama begins at 5pm and the main steelband competition at 8pm.' };
  if (day === '2026-08-30') return { label: 'Today · Family Day', title: 'J’ouvert into Family Day', copy: 'J’ouvert starts at 6am, with sound systems from 12–7pm and the 72-second reflection at 3pm.' };
  if (day === '2026-08-31') return { label: 'Today · Adults Day', title: 'The road in full colour', copy: 'The main parade starts at 10:30am, sound systems run 12–7pm and the 72-second reflection is at 3pm.' };
  if (day > '2026-08-31') return { label: 'Carnival archive', title: 'The road lives on', copy: 'Return to the stories, revisit the map and add the memory you want Carnival to keep.' };
  return { label: 'Before the road', title: 'Choose your sound before the weekend', copy: 'Save the guide, build a short route and keep travel and access notes close. The official operational map is still pending.' };
}

export const CARNIVAL_GUIDE_FALLBACK: CarnivalGuideContent = {
  status: carnivalGuideStatus(),
  weekend: [
    { id: 'sat', kicker: 'SAT 29 AUG · GATES 4PM · PANORAMA 8PM', title: 'Panorama', body: 'The national steelband competition takes over Emslie Horniman’s Pleasance Park. It is ticketed separately—and it is not a warm-up.', imageUrl: panoramaImage },
    { id: 'sun', kicker: 'SUN 30 AUG · J’OUVERT 6AM · SOUNDS 12–7PM', title: 'Family Day', body: 'The early-morning road opens into Family Day, with children’s mas, static sound systems and stages across west London.', imageUrl: familyDayImage },
    { id: 'mon', kicker: 'MON 31 AUG · PARADE 10:30AM · SOUNDS 12–7PM', title: 'Adults Day', body: 'The main parade brings the bands, costumes and music back onto the road for Carnival’s biggest day.', imageUrl: adultsDayImage },
  ],
  bands: [
    { name: 'Children’s bands', names: ['Arawak', 'Arts-A-Light Mas', 'Burrokeets', 'CAPCA', 'Caribbean Sessions', 'Carnival Revellers', 'D Riddim Tribe', 'Decore Mas Band', 'Duka Mas Domnik UK', 'Ebony Mas', 'Funatik Mas', 'Gemz Mas', 'Heritage Social Arts and Dance Group', 'Hotwax Mas', 'Jamaican Twist', 'M2K Mas', 'Magical Mas', 'Mahogany Carnival Club', 'Mangrove Mas Band', 'Mas Africa', 'Masology', 'Monarch Mas', 'Paddington Arts Elimu', 'Reign Mas Band', 'Soca Massive Fancy Sailors UK', 'Tears Mas', 'Trinbago Carnival Club & Inspiration Arts', 'Tropical Fusion Mas', 'Tropical Isles', 'Urban Touch', 'Utopia Mas UK', 'Vibrance Mas'] },
    { name: 'Mas bands', names: ['Abir Mas', 'Arawak', 'Arts-A-Light Mas', 'Burrokeets', 'CAPCA', 'Caribbean Sessions', 'Carnival Revellers', 'Chocolate Nation Mas', 'Colours Carnival', 'D Riddim Tribe', 'Decore Mas Band', 'Duka Mas Domnik UK Carnival Band', 'Ebony Mas', 'Creed', 'Funatik Mas', 'Gemz Mas', 'Heritage Social Arts and Dance Group', 'Hotwax Mas', 'Hype Mas', 'Island Mas', 'Jamaican Twist', 'Karnival Mania', 'Lagniappe', 'M2K Mas', 'Magical Mas', 'Mahogany Carnival Club', 'Mangrove Mas Band', 'Mas Africa', 'Masology', 'Monarch', 'Omnia Carnival', 'Paddington Arts Elimu', 'Reign Mas Band', 'Soca Massive Fancy Sailors UK', 'Tears Mas', 'Trinbago Carnival Club & Inspiration Arts', 'Tropical Fusion Mas', 'Tropical Isles', 'TT Mudders', 'UCOM Carnival', 'Urban Touch', 'Utopia Mas UK', 'Vibrance Mas'] },
    { name: 'Brazilian bands', names: ['Baque de Axé', 'Batala', 'Dendê Nation', 'Império da Rainha School of Samba', 'Kinetika Bloco', 'London School of Samba', 'Tribo'] },
    { name: 'Steel bands', names: ['Glissando Steel Orchestra', 'Mangrove Steelband', 'Metronomes Steel Orchestra', 'Pan Nation Steel Orchestra', 'Panectar Steelband', 'Pantonic Steel Orchestra', 'Raspo Steel Orchestra', 'Real Steel', 'St Michael and All Angels Steel Orchestra', 'Stardust Steel Orchestra', 'Steel Pan in Motion', 'UFO Steelband', 'Ebony Steelband'] },
    { name: 'Dutty Mas', names: ['Abir Mas', 'Chocolate Nation Mas', 'Colours Carnival', 'Hype Mas', 'Island Mas', 'Karnival Mania', 'Lagniappe', 'Omnia Carnival', 'Monarch Mas', 'UCOM Carnival'] },
  ],
  travel: [
    { name: 'Paddington', status: 'Recommended arrival', detail: 'Official 2026 advice calls this the easiest and least crowded public-transport approach. Follow the signed walking route.' },
    { name: 'Ladbroke Grove', status: 'Closed all day', detail: 'Closed on Sunday and Monday.' },
    { name: 'Notting Hill Gate', status: 'No entry 11am–6pm', detail: 'No station entry between 11:00 and 18:00 on Sunday and Monday.' },
    { name: 'Westbourne Park', status: 'No entry after 11am', detail: 'From 11:00 there is no station entry on Sunday and Monday.' },
    { name: 'Holland Park', status: 'Restricted, then closed', detail: 'No entry 11:00–15:00; station closes at 15:00.' },
    { name: 'Royal Oak', status: 'Restricted, then closed', detail: 'No entry 11:00–18:00; station closes at 18:00.' },
  ],
  access: [
    { name: 'Judging Zone', detail: 'Great Western Road viewing with a wheelchair-access platform; space is limited.' },
    { name: 'Portobello Green', detail: 'Park space with views of the passing parade.' },
    { name: 'The Tabernacle', detail: 'Courtyard vantage point and facilities; a small weekend entry charge applies.' },
    { name: 'St Stephen’s Gardens', detail: 'A dedicated alcohol-free, smoke-free and food-free chilled space for rest and conversation.' },
    { name: 'Meanwhile Gardens', detail: 'Green space, children’s activity and parade viewing north of Westbourne Park.' },
  ],
  faqs: [
    { question: 'When is Notting Hill Carnival 2026?', answer: 'Panorama opens the weekend on Saturday 29 August. J’ouvert and Family Day are Sunday 30 August, and Adults Day is Monday 31 August.' },
    { question: 'Is Carnival free?', answer: 'The Sunday and Monday street celebrations are free. Saturday’s Panorama is separately ticketed.' },
    { question: 'What time do the sound systems play?', answer: 'Confirmed static sound systems and live stages run from 12pm to 7pm on Sunday and Monday.' },
    { question: 'What is the easiest way to arrive?', answer: 'Current official advice recommends Paddington. Always check TfL before leaving.' },
    { question: 'Is this the official Carnival route map?', answer: 'No. This is PLUGGD’s independent culture and discovery map. Operational layers are not guessed.' },
    { question: 'Where can I find accessibility information?', answer: 'Use the access guide for confirmed viewing destinations and step-free travel notes. Exact utility pins appear only when current official coordinates are confirmed.' },
  ],
};
