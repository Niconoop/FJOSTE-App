/**
 * Compact ETS2 city lookup table.
 * Used by GameMapWidget to resolve source/destination city names to coordinates.
 * Subset of the full ets2_cities.json with the most common cities.
 */

export interface Ets2City {
  gameName: string;
  realName: string;
  country: string;
  x: number;
  z: number;
  lat: number;
  lng: number;
}

// Loaded lazily from the full JSON when needed
let _allCities: Ets2City[] | null = null;

const COMMON_CITIES: Ets2City[] = [
  { gameName: "berlin", realName: "Berlin", country: "germany", x: 10070.25, z: -9774.412, lat: 52.517389, lng: 13.395131 },
  { gameName: "hamburg", realName: "Hamburg", country: "germany", x: -1989.667, z: -17284.371, lat: 53.551086, lng: 9.993682 },
  { gameName: "munich", realName: "München", country: "germany", x: 1063.7, z: 12175.66, lat: 48.135124, lng: 11.581981 },
  { gameName: "frankfurt", realName: "Frankfurt am Main", country: "germany", x: -8989.77, z: 1152.55, lat: 50.110924, lng: 8.682127 },
  { gameName: "koln", realName: "Köln", country: "germany", x: -15008.66, z: -2926.83, lat: 50.937531, lng: 6.960279 },
  { gameName: "dusseldorf", realName: "Düsseldorf", country: "germany", x: -13576.793, z: -4598.689, lat: 51.225402, lng: 6.776314 },
  { gameName: "dortmund", realName: "Dortmund", country: "germany", x: -10883.449, z: -6378.83, lat: 51.514227, lng: 7.465279 },
  { gameName: "duisburg", realName: "Duisburg", country: "germany", x: -13800.526, z: -6466.346, lat: 51.434999, lng: 6.759562 },
  { gameName: "hannover", realName: "Hannover", country: "germany", x: -2192.543, z: -9750.893, lat: 52.375892, lng: 9.73201 },
  { gameName: "bremen", realName: "Bremen", country: "germany", x: -5184.582, z: -14018.432, lat: 53.07582, lng: 8.807165 },
  { gameName: "dresden", realName: "Dresden", country: "germany", x: 11634.922, z: -1841.874, lat: 51.049329, lng: 13.738144 },
  { gameName: "leipzig", realName: "Leipzig", country: "germany", x: 6694.066, z: -4012.474, lat: 51.340199, lng: 12.360103 },
  { gameName: "nurnberg", realName: "Nürnberg", country: "germany", x: 1089.93, z: 6060.88, lat: 49.452225, lng: 11.076724 },
  { gameName: "stuttgart", realName: "Stuttgart", country: "germany", x: -6002.22, z: 8355.66, lat: 48.775846, lng: 9.182932 },
  { gameName: "mannheim", realName: "Mannheim", country: "germany", x: -9475.04, z: 5399.41, lat: 49.487457, lng: 8.466039 },
  { gameName: "kassel", realName: "Kassel", country: "germany", x: -4149.49, z: -3625.26, lat: 51.312801, lng: 9.481544 },
  { gameName: "kiel", realName: "Kiel", country: "germany", x: -1198.07, z: -23020.56, lat: 54.321917, lng: 10.134907 },
  { gameName: "rostock", realName: "Rostock", country: "germany", x: 6189.6, z: -20279.66, lat: 54.092441, lng: 12.099147 },
  { gameName: "amsterdam", realName: "Amsterdam", country: "netherlands", x: -19042.082, z: -11308.295, lat: 52.37308, lng: 4.892453 },
  { gameName: "rotterdam", realName: "Rotterdam", country: "netherlands", x: -21285.52, z: -8190.82, lat: 51.922538, lng: 4.479617 },
  { gameName: "brussel", realName: "Brussel", country: "belgium", x: -22100.25, z: -2415.147, lat: 50.855103, lng: 4.351091 },
  { gameName: "paris", realName: "Paris", country: "france", x: -30980.39, z: 5186.06, lat: 48.856613, lng: 2.352222 },
  { gameName: "lyon", realName: "Lyon", country: "france", x: -24005.56, z: 24200.16, lat: 45.764043, lng: 4.835659 },
  { gameName: "marseille", realName: "Marseille", country: "france", x: -24900.13, z: 36990.33, lat: 43.296482, lng: 5.36978 },
  { gameName: "bordeaux", realName: "Bordeaux", country: "france", x: -46138.562, z: 27274.396, lat: 44.841225, lng: -0.580036 },
  { gameName: "toulouse", realName: "Toulouse", country: "france", x: -42062.77, z: 32815.08, lat: 43.604652, lng: 1.444209 },
  { gameName: "calais", realName: "Calais", country: "france", x: -30340.402, z: -4985.639, lat: 50.952477, lng: 1.853845 },
  { gameName: "london", realName: "London", country: "england", x: -37740.13, z: -13268.41, lat: 51.507351, lng: -0.127758 },
  { gameName: "dover", realName: "Dover", country: "england", x: -33321.949, z: -7884.354, lat: 51.125127, lng: 1.313423 },
  { gameName: "birmingham", realName: "Birmingham", country: "england", x: -45951.125, z: -20422.998, lat: 52.494899, lng: -1.851844 },
  { gameName: "manchester", realName: "Manchester", country: "england", x: -44975.14, z: -28252.07, lat: 53.480759, lng: -2.242631 },
  { gameName: "liverpool", realName: "Liverpool", country: "england", x: -47979.48, z: -27033.52, lat: 53.408371, lng: -2.991573 },
  { gameName: "milano", realName: "Milano", country: "italy", x: -5397.6, z: 28984.18, lat: 45.464204, lng: 9.189982 },
  { gameName: "roma", realName: "Roma", country: "italy", x: 7624.92, z: 50045.69, lat: 41.902782, lng: 12.496366 },
  { gameName: "napoli", realName: "Napoli", country: "italy", x: 14174.96, z: 56327.48, lat: 40.851775, lng: 14.268124 },
  { gameName: "torino", realName: "Torino", country: "italy", x: -12116.75, z: 27034.5, lat: 45.070312, lng: 7.686857 },
  { gameName: "genova", realName: "Genova", country: "italy", x: -7944.5, z: 33258.75, lat: 44.40564, lng: 8.946256 },
  { gameName: "bologna", realName: "Bologna", country: "italy", x: 1120.178, z: 33802.964, lat: 44.49382, lng: 11.342633 },
  { gameName: "venezia", realName: "Venezia", country: "italy", x: 5490.31, z: 28399.08, lat: 45.440847, lng: 12.315515 },
  { gameName: "firenze", realName: "Firenze", country: "italy", x: 1253.83, z: 38750.66, lat: 43.773105, lng: 11.254902 },
  { gameName: "praha", realName: "Praha", country: "czech republic", x: 16118.37, z: 1723.44, lat: 50.075538, lng: 14.4378 },
  { gameName: "bratislava", realName: "Bratislava", country: "slovakia", x: 24823.297, z: 14831.022, lat: 48.151699, lng: 17.109306 },
  { gameName: "budapest", realName: "Budapest", country: "hungary", x: 32367.82, z: 17882.724, lat: 47.497879, lng: 19.040238 },
  { gameName: "warszawa", realName: "Warszawa", country: "poland", x: 33016.117, z: -10810.57, lat: 52.229675, lng: 21.012229 },
  { gameName: "krakow", realName: "Kraków", country: "poland", x: 30380.84, z: 2009.57, lat: 50.064651, lng: 19.944981 },
  { gameName: "wroclaw", realName: "Wrocław", country: "poland", x: 21106.09, z: -3000.08, lat: 51.107883, lng: 17.038538 },
  { gameName: "gdansk", realName: "Gdańsk", country: "poland", x: 27073.58, z: -22094.71, lat: 54.352025, lng: 18.646638 },
  { gameName: "poznan", realName: "Poznań", country: "poland", x: 20016.84, z: -10490.85, lat: 52.406376, lng: 16.92517 },
  { gameName: "wien", realName: "Wien", country: "austria", x: 21375.5, z: 12885.75, lat: 48.208176, lng: 16.373819 },
  { gameName: "zurich", realName: "Zürich", country: "switzerland", x: -9065.98, z: 17270.77, lat: 47.376887, lng: 8.541694 },
  { gameName: "bern", realName: "Bern", country: "switzerland", x: -12304.097, z: 20489.087, lat: 46.948474, lng: 7.452175 },
  { gameName: "oslo", realName: "Oslo", country: "norway", x: 1058.3, z: -48266.07, lat: 59.913868, lng: 10.752245 },
  { gameName: "stockholm", realName: "Stockholm", country: "sweden", x: 21429.46, z: -45447.03, lat: 59.329323, lng: 18.068581 },
  { gameName: "goteborg", realName: "Göteborg", country: "sweden", x: 7192.97, z: -40455.49, lat: 57.70887, lng: 11.97456 },
  { gameName: "malmo", realName: "Malmö", country: "sweden", x: 6497.3, z: -31625.47, lat: 55.604981, lng: 13.003822 },
  { gameName: "kobenhavn", realName: "København", country: "denmark", x: 5483.31, z: -29168.1, lat: 55.676098, lng: 12.568337 },
  { gameName: "helsinki", realName: "Helsinki", country: "finland", x: 38816.55, z: -48738.13, lat: 60.169856, lng: 24.938379 },
  { gameName: "lisboa", realName: "Lisboa", country: "portugal", x: -91263.15, z: 52139.11, lat: 38.722252, lng: -9.139337 },
  { gameName: "madrid", realName: "Madrid", country: "spain", x: -66890.57, z: 47580.19, lat: 40.416775, lng: -3.70379 },
  { gameName: "barcelona", realName: "Barcelona", country: "spain", x: -38266.383, z: 48093.486, lat: 41.38258, lng: 2.177073 },
  { gameName: "sevilla", realName: "Sevilla", country: "spain", x: -78625.23, z: 64233.75, lat: 37.389092, lng: -5.984459 },
  { gameName: "bucuresti", realName: "București", country: "romania", x: 61121.012, z: 31703.736, lat: 44.436141, lng: 26.102684 },
  { gameName: "istanbul", realName: "İstanbul", country: "turkey", x: 79000.0, z: 49000.0, lat: 41.008238, lng: 28.978359 },
  { gameName: "luxembourg", realName: "Luxembourg", country: "luxembourg", x: -17755.43, z: 1261.63, lat: 49.611622, lng: 6.131935 },
  { gameName: "strasbourg", realName: "Strasbourg", country: "france", x: -13985.95, z: 7816.95, lat: 48.573405, lng: 7.752111 },
  { gameName: "linz", realName: "Linz", country: "austria", x: 13913.35, z: 12192.29, lat: 48.306939, lng: 14.285830 },
  { gameName: "graz", realName: "Graz", country: "austria", x: 18063.52, z: 18080.65, lat: 47.070714, lng: 15.439504 },
  { gameName: "innsbruck", realName: "Innsbruck", country: "austria", x: 2855.88, z: 16475.88, lat: 47.263113, lng: 11.39524 },
  { gameName: "salzburg", realName: "Salzburg", country: "austria", x: 9289.12, z: 14087.38, lat: 47.80949, lng: 13.055010 },
];

/**
 * Find a city by name (case-insensitive, matches gameName OR realName).
 */
export function findCity(name: string): Ets2City | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  
  // Try common cities first (fast path)
  const found = COMMON_CITIES.find(
    c => c.gameName === lower || c.realName.toLowerCase() === lower
  );
  if (found) return found;
  
  // Fuzzy match: check if any city name starts with or contains the search
  return COMMON_CITIES.find(
    c => c.realName.toLowerCase().startsWith(lower) || c.gameName.startsWith(lower)
  );
}

/**
 * Get all common cities.
 */
export function getAllCities(): readonly Ets2City[] {
  return COMMON_CITIES;
}
