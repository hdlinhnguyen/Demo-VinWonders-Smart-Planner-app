import parkData from "./vinwonders_locations.json";

export interface ParkCoords {
  x: number;
  y: number;
}

export interface ParkLocation {
  id: string;
  name: string;
  zone: string;
  type: string;
  typeLabel: string;
  coords: ParkCoords;
  description: string;
  openingHours: string;
  estimatedDurationMinutes: number;
  ageRestriction: string;
  highlights: string[];
  shortSummary?: string;
  searchTerms?: string[];
  chatAnswerHint?: string;
}

export interface ParkRoute {
  id: string;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  style?: {
    color?: string;
    weight?: number;
    dashArray?: string;
  };
}

export interface ParkZone {
  id: string;
  name: string;
  color: string;
  aliases?: string[];
  chatKeywords?: string[];
}

export interface LocationTypeDef {
  id: string;
  typeLabel: string;
  chatKeywords: string[];
  userPhrases: string[];
  proximityQuestion?: string;
}

export interface ParkDataFile {
  meta: {
    park: string;
    mapWidth: number;
    mapHeight: number;
    locationCount: number;
    version?: string;
  };
  locationTypes?: Record<string, LocationTypeDef>;
  zones: ParkZone[];
  routes: ParkRoute[];
  locations: ParkLocation[];
}

export const PARK_DATA = parkData as ParkDataFile;
export const ALL_LOCATIONS = PARK_DATA.locations;
export const LOCATION_TYPES: Record<string, LocationTypeDef> =
  PARK_DATA.locationTypes ?? {};
export const PARK_ROUTES = PARK_DATA.routes;
export const PARK_ZONES = PARK_DATA.zones;

export const MAP_WIDTH = PARK_DATA.meta.mapWidth;
export const MAP_HEIGHT = PARK_DATA.meta.mapHeight;

const ZONE_COLORS: Record<string, string> = Object.fromEntries(
  PARK_ZONES.map((z) => [z.name, z.color])
);

const TYPE_GRADIENTS: Record<string, string> = {
  adventure: "from-orange-500 to-red-600",
  restaurant: "from-amber-400 to-orange-600",
  medical: "from-emerald-400 to-teal-600",
  info: "from-slate-400 to-slate-600",
  shopping: "from-pink-400 to-rose-600",
  water: "from-sky-400 to-indigo-600",
  aquarium: "from-cyan-500 to-blue-700",
  viking: "from-stone-500 to-amber-800",
  magic: "from-violet-500 to-purple-800",
  castle: "from-indigo-500 to-purple-900",
  gate: "from-green-500 to-emerald-700",
};

const TYPE_TAGS: Record<string, string[]> = {
  adventure: ["mạo hiểm", "cảm giác mạnh", "trò chơi"],
  restaurant: ["ăn", "uống", "ẩm thực", "nghỉ"],
  medical: ["y tế", "sơ cứu", "an toàn"],
  info: ["thông tin", "bản đồ", "hướng dẫn"],
  shopping: ["mua sắm", "quà", "trang phục"],
  water: ["nước", "bơi", "trượt", "công viên nước"],
  aquarium: ["thủy cung", "khám phá", "gia đình"],
  viking: ["viking", "phiêu lưu", "khám phá"],
  magic: ["ma thuật", "show", "gia đình"],
  castle: ["lâu đài", "châu âu", "chụp ảnh"],
  gate: ["cổng", "vào cửa", "check-in"],
};

/** Spot card dùng trong Discovery panel (tương thích UI cũ) */
export interface Spot {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  waitTime: string;
  gradient: string;
  tags: string[];
  description: string;
  coords: ParkCoords;
  type: string;
  zoneColor: string;
}

function ratingFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 10;
  return 4.4 + h * 0.05;
}

export function locationToSpot(loc: ParkLocation): Spot {
  const zoneTags = loc.zone
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return {
    id: loc.id,
    name: loc.name,
    location: loc.zone,
    category: loc.typeLabel,
    rating: Math.round(ratingFromId(loc.id) * 10) / 10,
    waitTime: `~${loc.estimatedDurationMinutes} phút`,
    gradient: TYPE_GRADIENTS[loc.type] ?? "from-gray-400 to-gray-600",
    tags: [
      ...new Set([
        ...(TYPE_TAGS[loc.type] ?? []),
        ...(loc.searchTerms ?? []).slice(0, 8),
        ...zoneTags,
        loc.typeLabel.toLowerCase(),
      ]),
    ],
    description: loc.shortSummary ?? loc.description,
    coords: loc.coords,
    type: loc.type,
    zoneColor: ZONE_COLORS[loc.zone] ?? "#64748b",
  };
}

export const ALL_SPOTS: Spot[] = ALL_LOCATIONS.map(locationToSpot);

export function getLocationById(id: string): ParkLocation | undefined {
  return ALL_LOCATIONS.find((l) => l.id === id);
}

export function filterSpotsByText(text: string, spots: Spot[] = ALL_SPOTS): Spot[] {
  const t = text.toLowerCase().trim();
  if (!t) return spots.slice(0, 12);

  const matched = spots.filter(
    (s) => {
      const loc = getLocationById(s.id);
      const terms = loc?.searchTerms ?? [];
      return (
        s.name.toLowerCase().includes(t) ||
        s.location.toLowerCase().includes(t) ||
        s.category.toLowerCase().includes(t) ||
        s.description.toLowerCase().includes(t) ||
        s.tags.some((tag) => t.includes(tag) || tag.includes(t.slice(0, 4))) ||
        terms.some(
          (term) =>
            t.includes(term.toLowerCase()) ||
            term.toLowerCase().includes(t.slice(0, Math.min(t.length, 6)))
        )
      );
    }
  );

  if (matched.length > 0) return matched.slice(0, 20);

  if (/vé|giá|combo/.test(t)) {
    return spots.filter((s) =>
      ["restaurant", "gate", "info", "shopping"].includes(s.type)
    ).slice(0, 8);
  }
  if (/giờ|mở cửa|show|lịch/.test(t)) {
    return spots.filter((s) =>
      ["magic", "water", "restaurant", "castle"].includes(s.type)
    ).slice(0, 8);
  }
  if (/gia đình|trẻ|trẻ em|trẻ nhỏ/.test(t)) {
    return spots.filter((s) =>
      s.tags.some((tag) => /gia đình|trẻ|nước|thủy/.test(tag))
    ).slice(0, 10);
  }
  if (/mạo hiểm|cảm giác|tàu|lượn/.test(t)) {
    return spots.filter((s) => s.type === "adventure" || s.type === "water").slice(0, 10);
  }
  if (/surprise|bất ngờ|gợi ý/.test(t)) {
    return [...spots].sort(() => Math.random() - 0.5).slice(0, 8);
  }

  return spots.slice(0, 8);
}

/** Tóm tắt địa điểm cho system prompt chatbot */
export function buildLocationsContext(): string {
  const lines: string[] = [
    `Công viên: ${PARK_DATA.meta.park}. Tổng ${ALL_LOCATIONS.length} địa điểm (mock_data v${PARK_DATA.meta.version ?? "1"}).`,
    "",
    "### Cách khách hay hỏi (map sang loại địa điểm)",
  ];

  for (const typeDef of Object.values(LOCATION_TYPES)) {
    lines.push(
      `- **${typeDef.typeLabel}** (${typeDef.id}): ${typeDef.chatKeywords.slice(0, 5).join(", ")}`
    );
    if (typeDef.proximityQuestion) {
      lines.push(`  Ví dụ: "${typeDef.proximityQuestion}"`);
    }
  }

  for (const zone of PARK_ZONES) {
    const items = ALL_LOCATIONS.filter((l) => l.zone === zone.name);
    lines.push(`\n## ${zone.name}`);
    if (zone.aliases?.length) {
      lines.push(`(Còn gọi: ${zone.aliases.join(", ")})`);
    }
    for (const loc of items) {
      lines.push(
        `- **${loc.name}** [${loc.typeLabel}]`,
        `  ${loc.shortSummary ?? loc.description.slice(0, 180)}`,
        `  Từ khóa: ${(loc.searchTerms ?? []).slice(0, 6).join(", ")}`
      );
    }
  }
  return lines.join("\n");
}
