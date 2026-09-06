import type { EventSource } from '@/data/event-source';
import type { StockholmEvent } from '@/types/event';

/**
 * Dates are generated relative to "now" so the Today / Weekend / Week filters
 * always have realistic content during development. Replace this whole module
 * with an `ApiEventSource` once the backend is live — nothing else changes.
 */
function dayAt(offsetDays: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function iso(date: Date): string {
  return date.toISOString();
}

function plusHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** Offset in days from today to the upcoming Saturday (0 when today is Saturday). */
function daysUntilSaturday(): number {
  return (6 - new Date().getDay() + 7) % 7;
}

const NOW_ISO = iso(new Date());
const SATURDAY = daysUntilSaturday();
const SUNDAY = SATURDAY + 1;

type MockSeed = Omit<StockholmEvent, 'startsAt' | 'endsAt' | 'updatedAt'> & {
  startOffsetDays: number;
  startHour: number;
  durationHours: number;
};

const SEEDS: MockSeed[] = [
  {
    id: 'evt-001',
    title: 'Rooftop Jazz at Fotografiska',
    description:
      'An intimate evening of live jazz on the rooftop terrace, with panoramic views over Stockholm harbour and a seasonal menu from the award-winning kitchen.',
    category: 'music',
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200',
    startOffsetDays: 0,
    startHour: 19,
    durationHours: 4,
    venue: {
      name: 'Fotografiska',
      address: 'Stadsgårdshamnen 22',
      district: 'Södermalm',
      latitude: 59.3181,
      longitude: 18.0857,
    },
    priceSek: 395,
    ticketUrl: 'https://www.fotografiska.com/sto/',
    organizer: 'Fotografiska',
    source: 'fotografiska',
    sourceId: 'fotografiska-rooftop-jazz',
    sourceUrl: 'https://www.fotografiska.com/sto/',
    isFeatured: true,
    qualityScore: 92,
  },
  {
    id: 'evt-002',
    title: 'Södermalm Vintage Pop-up',
    description:
      'A one-day pop-up gathering the best vintage and second-hand sellers in the city. Curated rails, vinyl crates and natural wine.',
    category: 'popup',
    imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
    startOffsetDays: 0,
    startHour: 12,
    durationHours: 6,
    venue: {
      name: 'Nytorget',
      address: 'Nytorget 4',
      district: 'Södermalm',
      latitude: 59.3122,
      longitude: 18.0806,
    },
    priceSek: 0,
    organizer: 'StoVintage',
    source: 'instagram',
    sourceId: 'sto-vintage-popup-nytorget',
    isFeatured: false,
    qualityScore: 61,
  },
  {
    id: 'evt-003',
    title: 'Modern Nordic Art Opening',
    description:
      'Vernissage for a new exhibition exploring light and landscape in contemporary Scandinavian painting.',
    category: 'art',
    imageUrl: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200',
    startOffsetDays: 1,
    startHour: 17,
    durationHours: 4,
    venue: {
      name: 'Moderna Museet',
      address: 'Exercisplan 4',
      district: 'Skeppsholmen',
      latitude: 59.3251,
      longitude: 18.0846,
    },
    priceSek: 0,
    ticketUrl: 'https://www.modernamuseet.se/stockholm/',
    organizer: 'Moderna Museet',
    source: 'modernamuseet',
    sourceId: 'moderna-nordic-light-vernissage',
    sourceUrl: 'https://www.modernamuseet.se/stockholm/',
    isFeatured: true,
    qualityScore: 88,
  },
  {
    id: 'evt-004',
    title: 'Stand-up Night at Norra Brunn',
    description:
      'Sweden’s sharpest comedians test new material in the city’s legendary basement club. English-friendly line-up.',
    category: 'comedy',
    imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200',
    startOffsetDays: 2,
    startHour: 20,
    durationHours: 2,
    venue: {
      name: 'Norra Brunn',
      address: 'Surbrunnsgatan 33',
      district: 'Vasastan',
      latitude: 59.343,
      longitude: 18.0567,
    },
    priceSek: 180,
    ticketUrl: 'https://norrabrunn.se/',
    organizer: 'Norra Brunn',
    source: 'norrabrunn',
    sourceId: 'norra-brunn-standup',
    sourceUrl: 'https://norrabrunn.se/',
    isFeatured: false,
    qualityScore: 70,
  },
  {
    id: 'evt-005',
    title: 'Hornstulls Loppis & Street Food',
    description:
      'The riverside weekend market returns with flea-market stalls, designers and a full line-up of street-food trucks along the water.',
    category: 'market',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
    startOffsetDays: SATURDAY,
    startHour: 11,
    durationHours: 6,
    venue: {
      name: 'Hornstulls Marknad',
      address: 'Hornstulls strand 4',
      district: 'Södermalm',
      latitude: 59.3153,
      longitude: 18.0322,
    },
    priceSek: 0,
    organizer: 'Hornstulls Marknad',
    source: 'hornstull',
    sourceId: 'hornstull-loppis-weekend',
    sourceUrl: 'https://hornstullsmarknad.se/',
    isFeatured: false,
    qualityScore: 66,
  },
  {
    id: 'evt-006',
    title: 'Trädgården Season Weekender',
    description:
      'The legendary outdoor club under Skanstullsbron brings international DJs across three floors all weekend long.',
    category: 'nightlife',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
    startOffsetDays: SATURDAY,
    startHour: 22,
    durationHours: 7,
    venue: {
      name: 'Trädgården',
      address: 'Hammarby Slussväg 2',
      district: 'Södermalm',
      latitude: 59.3067,
      longitude: 18.0847,
    },
    priceSek: 220,
    ticketUrl: 'https://tradgarden.com/',
    organizer: 'Trädgården',
    source: 'tradgarden',
    sourceId: 'tradgarden-season-weekender',
    sourceUrl: 'https://tradgarden.com/',
    isFeatured: true,
    qualityScore: 84,
  },
  {
    id: 'evt-007',
    title: 'Junibacken Family Storytelling',
    description:
      'A morning of interactive storytelling and the Story Train through the worlds of Astrid Lindgren. Perfect for young children.',
    category: 'family',
    imageUrl: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=1200',
    startOffsetDays: SUNDAY,
    startHour: 10,
    durationHours: 2,
    venue: {
      name: 'Junibacken',
      address: 'Galärvarvsvägen 8',
      district: 'Djurgården',
      latitude: 59.3277,
      longitude: 18.0921,
    },
    priceSek: 185,
    ticketUrl: 'https://junibacken.se/',
    organizer: 'Junibacken',
    source: 'junibacken',
    sourceId: 'junibacken-storytelling',
    sourceUrl: 'https://junibacken.se/',
    isFeatured: false,
    qualityScore: 58,
  },
  {
    id: 'evt-008',
    title: 'Shakespeare in the Park: The Tempest',
    description:
      'Open-air theatre in Vitabergsparken. Bring a blanket and a picnic; performance runs rain or shine.',
    category: 'theatre',
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
    startOffsetDays: 5,
    startHour: 20,
    durationHours: 2,
    venue: {
      name: 'Vitabergsparken',
      address: 'Vitabergsparken',
      district: 'Södermalm',
      latitude: 59.3126,
      longitude: 18.0917,
    },
    priceSek: 250,
    ticketUrl: 'https://parkteatern.stockholm/',
    organizer: 'Parkteatern',
    source: 'parkteatern',
    sourceId: 'parkteatern-tempest',
    sourceUrl: 'https://parkteatern.stockholm/',
    isFeatured: false,
    qualityScore: 74,
  },
  {
    id: 'evt-009',
    title: 'Djurgården IF vs. AIK',
    description:
      'Allsvenskan derby night. Expect a packed stadium and one of the best atmospheres in Swedish football.',
    category: 'sports',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200',
    startOffsetDays: 6,
    startHour: 18,
    durationHours: 2,
    venue: {
      name: 'Tele2 Arena',
      address: 'Arenaslingan 14',
      district: 'Johanneshov',
      latitude: 59.2937,
      longitude: 18.0839,
    },
    priceSek: 320,
    ticketUrl: 'https://www.tele2arena.se/',
    organizer: 'Djurgården IF',
    source: 'ticketmaster',
    sourceId: 'tm-dif-aik-derby',
    sourceUrl: 'https://www.ticketmaster.se/',
    isFeatured: false,
    qualityScore: 79,
  },
  {
    id: 'evt-010',
    title: 'Natural Wine Fair',
    description:
      'Meet growers and importers pouring low-intervention wines from across Europe. Small plates from local kitchens included.',
    category: 'food',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200',
    startOffsetDays: 9,
    startHour: 15,
    durationHours: 5,
    venue: {
      name: 'Nedre Foto',
      address: 'Tegelviksgatan 40',
      district: 'Södermalm',
      latitude: 59.3096,
      longitude: 18.1004,
    },
    priceSek: 295,
    ticketUrl: 'https://example.com/tickets/natural-wine-fair',
    organizer: 'Stockholm Wine Collective',
    source: 'eventbrite',
    sourceId: 'eb-natural-wine-fair',
    sourceUrl: 'https://www.eventbrite.com/',
    isFeatured: true,
    qualityScore: 81,
  },
  {
    id: 'evt-011',
    title: 'Gröna Lund: Håkan Hellström Live',
    description:
      'Sweden’s biggest sing-along act returns to the amusement park stage. Concert included with park admission.',
    category: 'music',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
    startOffsetDays: 14,
    startHour: 20,
    durationHours: 2,
    venue: {
      name: 'Gröna Lund',
      address: 'Lilla Allmänna Gränd 9',
      district: 'Djurgården',
      latitude: 59.3235,
      longitude: 18.0951,
    },
    priceSek: 445,
    ticketUrl: 'https://www.gronalund.com/',
    organizer: 'Gröna Lund',
    source: 'ticketmaster',
    sourceId: 'tm-hakan-hellstrom-grona-lund',
    sourceUrl: 'https://www.ticketmaster.se/',
    isFeatured: true,
    qualityScore: 95,
  },
  {
    id: 'evt-012',
    title: 'NK Autumn Design Market',
    description:
      'Independent Scandinavian designers take over the department store atrium for a weekend of homeware, ceramics and prints.',
    category: 'shopping',
    imageUrl: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=1200',
    startOffsetDays: 20,
    startHour: 10,
    durationHours: 8,
    venue: {
      name: 'NK',
      address: 'Hamngatan 18-20',
      district: 'Norrmalm',
      latitude: 59.3326,
      longitude: 18.0688,
    },
    priceSek: 0,
    organizer: 'NK Stockholm',
    source: 'visitstockholm',
    sourceId: 'visit-nk-design-market',
    sourceUrl: 'https://www.visitstockholm.com/',
    isFeatured: false,
    qualityScore: 64,
  },
];

const MOCK_EVENTS: StockholmEvent[] = SEEDS.map((seed) => {
  const { startOffsetDays, startHour, durationHours, ...rest } = seed;
  const start = dayAt(startOffsetDays, startHour);
  return {
    ...rest,
    startsAt: iso(start),
    endsAt: iso(plusHours(start, durationHours)),
    updatedAt: NOW_ISO,
  };
});

const NETWORK_DELAY_MS = 400;

function delay<T>(value: T, ms = NETWORK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * In-memory event source used during development. Simulates async latency so
 * loading and error states can be exercised before a real backend exists.
 */
export class MockEventSource implements EventSource {
  readonly attribution = null;

  async list(): Promise<StockholmEvent[]> {
    const sorted = [...MOCK_EVENTS].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return delay(sorted);
  }

  async getById(id: string): Promise<StockholmEvent | null> {
    return delay(MOCK_EVENTS.find((event) => event.id === id) ?? null);
  }
}
