/**
 * ETS2 Speed Camera Data & Proximity Engine
 * Directly extracted from vertices in ets2.geojson.
 */

export interface SpeedCamera {
  id: string;
  lat: number;
  lng: number;
  speedLimit: number;
  country: string;
  road: string;
  type: "gantry" | "pole" | "box";
}

export interface SpeedcamAlertInfo {
  camera: SpeedCamera;
  distanceMeters: number;
  currentSpeed: number;
  isSpeeding: boolean;
  overspeedKmh: number;
}

export const ETS2_SPEED_CAMERAS: SpeedCamera[] = [
  {
    "id": "de-a1-1",
    "lat": 51.519297,
    "lng": 7.465849,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A1 Dortmund Kreuz",
    "type": "gantry"
  },
  {
    "id": "de-a1-2",
    "lat": 51.002145,
    "lng": 6.992751,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A1 Köln Nord / Leverkusen",
    "type": "gantry"
  },
  {
    "id": "de-a1-3",
    "lat": 53.06697,
    "lng": 8.809203,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A1 Bremer Kreuz",
    "type": "pole"
  },
  {
    "id": "de-a1-4",
    "lat": 53.48527,
    "lng": 9.976696,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A1 Buchholzer Dreieck",
    "type": "gantry"
  },
  {
    "id": "de-a2-1",
    "lat": 52.406402,
    "lng": 9.786752,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A2 Hannover Ost",
    "type": "gantry"
  },
  {
    "id": "de-a2-2",
    "lat": 52.1372,
    "lng": 11.533938,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A2 Magdeburg Kreuz",
    "type": "pole"
  },
  {
    "id": "de-a2-3",
    "lat": 51.563067,
    "lng": 7.666971,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A2 Kamener Kreuz",
    "type": "gantry"
  },
  {
    "id": "de-a3-1",
    "lat": 50.05109,
    "lng": 8.572521,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A3 Frankfurter Kreuz",
    "type": "gantry"
  },
  {
    "id": "de-a3-2",
    "lat": 49.483126,
    "lng": 11.060145,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A3 Nürnberg Nord",
    "type": "pole"
  },
  {
    "id": "de-a3-3",
    "lat": 49.704495,
    "lng": 9.939711,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A3 Würzburg Biebelried",
    "type": "gantry"
  },
  {
    "id": "de-a4-1",
    "lat": 51.050306,
    "lng": 13.741912,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A4 Dresden West",
    "type": "pole"
  },
  {
    "id": "de-a4-2",
    "lat": 50.96669,
    "lng": 11.006934,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A4 Erfurt Ost",
    "type": "gantry"
  },
  {
    "id": "de-a5-1",
    "lat": 49.458196,
    "lng": 8.509259,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A5 Heidelberg / Mannheim",
    "type": "gantry"
  },
  {
    "id": "de-a5-2",
    "lat": 49.042972,
    "lng": 8.373705,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A5 Karlsruher Dreieck",
    "type": "pole"
  },
  {
    "id": "de-a7-1",
    "lat": 53.490412,
    "lng": 9.905854,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A7 Hamburg Elbtunnel",
    "type": "gantry"
  },
  {
    "id": "de-a7-2",
    "lat": 51.226952,
    "lng": 9.482211,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A7 Kasseler Berge",
    "type": "pole"
  },
  {
    "id": "de-a7-3",
    "lat": 48.447506,
    "lng": 9.993469,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A7 Ulm / Elchingen",
    "type": "pole"
  },
  {
    "id": "de-a8-1",
    "lat": 48.705795,
    "lng": 9.100678,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A8 Stuttgart Albaufstieg",
    "type": "pole"
  },
  {
    "id": "de-a8-2",
    "lat": 48.169281,
    "lng": 11.419801,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A8 München Eschenried",
    "type": "gantry"
  },
  {
    "id": "de-a9-1",
    "lat": 52.320434,
    "lng": 13.001483,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A9 Dreieck Potsdam",
    "type": "gantry"
  },
  {
    "id": "de-a9-2",
    "lat": 51.399479,
    "lng": 12.200408,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A9 Schkeuditzer Kreuz",
    "type": "pole"
  },
  {
    "id": "de-a9-3",
    "lat": 49.485048,
    "lng": 11.128644,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A9 Nürnberg Ost",
    "type": "gantry"
  },
  {
    "id": "de-a10-1",
    "lat": 52.589466,
    "lng": 13.552484,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A10 Berliner Ring Ost",
    "type": "gantry"
  },
  {
    "id": "de-a40-1",
    "lat": 51.472266,
    "lng": 6.786212,
    "speedLimit": 60,
    "country": "Germany",
    "road": "A40 Ruhrschnellweg Duisburg",
    "type": "box"
  },
  {
    "id": "de-b1-1",
    "lat": 51.512385,
    "lng": 7.452712,
    "speedLimit": 50,
    "country": "Germany",
    "road": "B1 Dortmund Westfalenhallen",
    "type": "box"
  },
  {
    "id": "fr-a1-1",
    "lat": 49.031157,
    "lng": 2.456147,
    "speedLimit": 90,
    "country": "France",
    "road": "A1 Paris Charles de Gaulle",
    "type": "gantry"
  },
  {
    "id": "fr-a1-2",
    "lat": 50.597684,
    "lng": 3.035912,
    "speedLimit": 90,
    "country": "France",
    "road": "A1 Lille Sud",
    "type": "pole"
  },
  {
    "id": "fr-a4-1",
    "lat": 49.112403,
    "lng": 4.087158,
    "speedLimit": 110,
    "country": "France",
    "road": "A4 Reims Contournement",
    "type": "pole"
  },
  {
    "id": "fr-a4-2",
    "lat": 48.689441,
    "lng": 7.631516,
    "speedLimit": 90,
    "country": "France",
    "road": "A4 Strasbourg Nord",
    "type": "gantry"
  },
  {
    "id": "fr-a6-1",
    "lat": 45.731182,
    "lng": 4.724371,
    "speedLimit": 70,
    "country": "France",
    "road": "A6 Tunnel de Fourvière",
    "type": "gantry"
  },
  {
    "id": "fr-a7-1",
    "lat": 45.522726,
    "lng": 4.776892,
    "speedLimit": 90,
    "country": "France",
    "road": "A7 Lyon Sud Chasse",
    "type": "gantry"
  },
  {
    "id": "fr-a7-2",
    "lat": 43.350374,
    "lng": 5.370263,
    "speedLimit": 90,
    "country": "France",
    "road": "A7 Marseille Entrée",
    "type": "pole"
  },
  {
    "id": "fr-a10-1",
    "lat": 44.829073,
    "lng": -0.506039,
    "speedLimit": 90,
    "country": "France",
    "road": "A10 Bordeaux Rocade",
    "type": "gantry"
  },
  {
    "id": "fr-a16-1",
    "lat": 50.891127,
    "lng": 1.841089,
    "speedLimit": 90,
    "country": "France",
    "road": "A16 Calais Port",
    "type": "pole"
  },
  {
    "id": "fr-a61-1",
    "lat": 43.573257,
    "lng": 1.447047,
    "speedLimit": 90,
    "country": "France",
    "road": "A61 Toulouse Périphérique",
    "type": "gantry"
  },
  {
    "id": "uk-m25-1",
    "lat": 51.559829,
    "lng": 0.140704,
    "speedLimit": 80,
    "country": "UK",
    "road": "M25 Dartford Crossing",
    "type": "gantry"
  },
  {
    "id": "uk-m25-2",
    "lat": 51.479502,
    "lng": -0.484029,
    "speedLimit": 80,
    "country": "UK",
    "road": "M25 Heathrow Airport",
    "type": "gantry"
  },
  {
    "id": "uk-m1-1",
    "lat": 51.613114,
    "lng": -0.371528,
    "speedLimit": 96,
    "country": "UK",
    "road": "M1 Luton / Watford",
    "type": "gantry"
  },
  {
    "id": "uk-m1-2",
    "lat": 53.392961,
    "lng": -1.356173,
    "speedLimit": 80,
    "country": "UK",
    "road": "M1 Sheffield Smart Motorway",
    "type": "gantry"
  },
  {
    "id": "uk-m6-1",
    "lat": 52.401283,
    "lng": -1.865802,
    "speedLimit": 80,
    "country": "UK",
    "road": "M6 Spaghetti Junction",
    "type": "gantry"
  },
  {
    "id": "uk-m62-1",
    "lat": 53.589481,
    "lng": -2.290432,
    "speedLimit": 80,
    "country": "UK",
    "road": "M62 Manchester Ring",
    "type": "gantry"
  },
  {
    "id": "uk-m20-1",
    "lat": 51.082653,
    "lng": 1.152938,
    "speedLimit": 80,
    "country": "UK",
    "road": "M20 Folkestone / Dover",
    "type": "pole"
  },
  {
    "id": "uk-m8-1",
    "lat": 55.778376,
    "lng": -4.283385,
    "speedLimit": 80,
    "country": "UK",
    "road": "M8 Glasgow Kingston Bridge",
    "type": "gantry"
  },
  {
    "id": "at-a1-1",
    "lat": 47.805256,
    "lng": 12.980406,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A1 Salzburg West",
    "type": "pole"
  },
  {
    "id": "at-a1-2",
    "lat": 48.183111,
    "lng": 16.387486,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A23 Wien Südosttangente",
    "type": "gantry"
  },
  {
    "id": "at-a12-1",
    "lat": 47.23105,
    "lng": 11.389091,
    "speedLimit": 100,
    "country": "Austria",
    "road": "A12 Inntal IG-L Radar",
    "type": "gantry"
  },
  {
    "id": "at-a13-1",
    "lat": 47.172457,
    "lng": 11.399353,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A13 Brennerpass Europabrücke",
    "type": "pole"
  },
  {
    "id": "at-a10-1",
    "lat": 47.656155,
    "lng": 13.168156,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A10 Tauernautobahn",
    "type": "box"
  },
  {
    "id": "ch-a1-1",
    "lat": 47.420514,
    "lng": 8.533038,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A1 Zürich Nordring",
    "type": "gantry"
  },
  {
    "id": "ch-a1-2",
    "lat": 46.214371,
    "lng": 6.118277,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A1 Genève Aéroport",
    "type": "pole"
  },
  {
    "id": "ch-a2-1",
    "lat": 46.731818,
    "lng": 8.565419,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A2 Gotthard Nordportal",
    "type": "gantry"
  },
  {
    "id": "it-a1-1",
    "lat": 45.447592,
    "lng": 9.209875,
    "speedLimit": 90,
    "country": "Italy",
    "road": "A1 Milano Sud Tangenziale",
    "type": "gantry"
  },
  {
    "id": "it-a1-2",
    "lat": 44.592463,
    "lng": 11.232391,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A1 Bologna Casalecchio",
    "type": "gantry"
  },
  {
    "id": "it-a1-3",
    "lat": 43.824572,
    "lng": 11.218478,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A1 Firenze Nord",
    "type": "pole"
  },
  {
    "id": "it-a1-4",
    "lat": 41.997542,
    "lng": 12.533668,
    "speedLimit": 90,
    "country": "Italy",
    "road": "GRA Roma Ring Nord",
    "type": "gantry"
  },
  {
    "id": "it-a4-1",
    "lat": 45.592585,
    "lng": 12.252165,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A4 Venezia Mestre",
    "type": "gantry"
  },
  {
    "id": "it-a4-2",
    "lat": 45.227412,
    "lng": 7.731324,
    "speedLimit": 90,
    "country": "Italy",
    "road": "A4 Torino / Settimo Torinese",
    "type": "gantry"
  },
  {
    "id": "it-a22-1",
    "lat": 45.374175,
    "lng": 10.849299,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A22 Autostrada del Brennero",
    "type": "pole"
  },
  {
    "id": "it-a7-1",
    "lat": 44.47535,
    "lng": 8.865047,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A7 Genova Bolzaneto",
    "type": "gantry"
  },
  {
    "id": "it-a3-1",
    "lat": 40.843852,
    "lng": 14.305398,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A3 Napoli Tangenziale",
    "type": "gantry"
  },
  {
    "id": "nl-a1-1",
    "lat": 52.380369,
    "lng": 4.919974,
    "speedLimit": 80,
    "country": "Netherlands",
    "road": "A10 Ring Amsterdam",
    "type": "gantry"
  },
  {
    "id": "nl-a4-1",
    "lat": 51.915229,
    "lng": 4.518153,
    "speedLimit": 80,
    "country": "Netherlands",
    "road": "A4 Rotterdam Trajectcontrole",
    "type": "gantry"
  },
  {
    "id": "be-e19-1",
    "lat": 51.178612,
    "lng": 4.415135,
    "speedLimit": 80,
    "country": "Belgium",
    "road": "R1 Antwerpen Ring",
    "type": "gantry"
  },
  {
    "id": "be-e40-1",
    "lat": 50.890473,
    "lng": 4.386957,
    "speedLimit": 90,
    "country": "Belgium",
    "road": "R0 Ring Bruxelles",
    "type": "gantry"
  },
  {
    "id": "be-e25-1",
    "lat": 50.621388,
    "lng": 5.557391,
    "speedLimit": 80,
    "country": "Belgium",
    "road": "E25 Liège Tunnel de Cointe",
    "type": "gantry"
  },
  {
    "id": "pl-a2-1",
    "lat": 52.20696,
    "lng": 20.956253,
    "speedLimit": 80,
    "country": "Poland",
    "road": "S8 / S2 Warszawa Ring",
    "type": "gantry"
  },
  {
    "id": "pl-a4-1",
    "lat": 51.049379,
    "lng": 16.965233,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A4 Wrocław Południe",
    "type": "pole"
  },
  {
    "id": "pl-a4-2",
    "lat": 50.078899,
    "lng": 19.907033,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A4 Kraków Balice",
    "type": "gantry"
  },
  {
    "id": "pl-a1-1",
    "lat": 54.283421,
    "lng": 18.596684,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A1 Gdańsk / Rusocin",
    "type": "pole"
  },
  {
    "id": "cz-d1-1",
    "lat": 50.037347,
    "lng": 14.481434,
    "speedLimit": 80,
    "country": "Czech Republic",
    "road": "D1 Praha Jih Chodov",
    "type": "gantry"
  },
  {
    "id": "cz-d1-2",
    "lat": 49.164865,
    "lng": 16.526635,
    "speedLimit": 80,
    "country": "Czech Republic",
    "road": "D1 Brno Jih",
    "type": "pole"
  },
  {
    "id": "sk-d1-1",
    "lat": 48.129838,
    "lng": 17.150994,
    "speedLimit": 90,
    "country": "Slovakia",
    "road": "D1 Bratislava Prístavný Most",
    "type": "gantry"
  },
  {
    "id": "dk-e20-1",
    "lat": 55.646372,
    "lng": 12.486308,
    "speedLimit": 80,
    "country": "Denmark",
    "road": "E20 København Storebælt",
    "type": "gantry"
  },
  {
    "id": "se-e4-1",
    "lat": 59.228902,
    "lng": 18.0047,
    "speedLimit": 70,
    "country": "Sweden",
    "road": "E4 Stockholm Essingeleden",
    "type": "gantry"
  },
  {
    "id": "se-e6-1",
    "lat": 57.804385,
    "lng": 11.945133,
    "speedLimit": 70,
    "country": "Sweden",
    "road": "E6 Göteborg Tingstadstunneln",
    "type": "gantry"
  },
  {
    "id": "se-e6-2",
    "lat": 55.545736,
    "lng": 13.025809,
    "speedLimit": 80,
    "country": "Sweden",
    "road": "E6 Malmö Ring",
    "type": "pole"
  },
  {
    "id": "no-e6-1",
    "lat": 59.843308,
    "lng": 10.784106,
    "speedLimit": 70,
    "country": "Norway",
    "road": "E6 Oslo Operatunnelen",
    "type": "gantry"
  },
  {
    "id": "no-e39-1",
    "lat": 60.384194,
    "lng": 5.357773,
    "speedLimit": 60,
    "country": "Norway",
    "road": "E39 Bergen Fløyfjellstunnel",
    "type": "box"
  },
  {
    "id": "es-m30-1",
    "lat": 40.399129,
    "lng": -3.697271,
    "speedLimit": 70,
    "country": "Spain",
    "road": "M-30 Madrid Calle 30",
    "type": "gantry"
  },
  {
    "id": "es-ap7-1",
    "lat": 41.415898,
    "lng": 2.105272,
    "speedLimit": 80,
    "country": "Spain",
    "road": "B-10 / B-20 Barcelona Ronda",
    "type": "gantry"
  },
  {
    "id": "es-v30-1",
    "lat": 39.491516,
    "lng": -0.376495,
    "speedLimit": 90,
    "country": "Spain",
    "road": "V-30 Valencia Bypass",
    "type": "gantry"
  },
  {
    "id": "es-se30-1",
    "lat": 37.398339,
    "lng": -5.986363,
    "speedLimit": 80,
    "country": "Spain",
    "road": "SE-30 Sevilla Ring",
    "type": "gantry"
  },
  {
    "id": "pt-a1-1",
    "lat": 38.610865,
    "lng": -9.197561,
    "speedLimit": 80,
    "country": "Portugal",
    "road": "2ª Circular Lisboa",
    "type": "gantry"
  },
  {
    "id": "pt-vci-1",
    "lat": 41.223246,
    "lng": -8.641908,
    "speedLimit": 80,
    "country": "Portugal",
    "road": "VCI Porto Ponte da Arrábida",
    "type": "gantry"
  }
];

export function getSpeedCamerasGeoJson() {
  return {
    type: 'FeatureCollection' as const,
    features: ETS2_SPEED_CAMERAS.map((cam) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [cam.lng, cam.lat],
      },
      properties: {
        id: cam.id,
        speedLimit: cam.speedLimit,
        country: cam.country,
        road: cam.road,
        type: cam.type,
        sprite: 'speedcam_ico',
      },
    })),
  };
}

export function findApproachingSpeedcam(
  lat: number,
  lng: number,
  currentSpeedKmh: number,
  maxDistanceMeters: number = 750
): SpeedcamAlertInfo | null {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  let closestCam: SpeedCamera | null = null;
  let minDistance = Infinity;

  const latKm = 111.0;
  const lngKm = 111.0 * Math.cos((lat * Math.PI) / 180);

  for (const cam of ETS2_SPEED_CAMERAS) {
    const dLat = (cam.lat - lat) * latKm;
    const dLng = (cam.lng - lng) * lngKm;
    const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 1000;

    if (distM < minDistance && distM <= maxDistanceMeters) {
      minDistance = distM;
      closestCam = cam;
    }
  }

  if (!closestCam) return null;

  const isSpeeding = currentSpeedKmh > closestCam.speedLimit;
  const overspeedKmh = Math.max(0, Math.round(currentSpeedKmh - closestCam.speedLimit));

  return {
    camera: closestCam,
    distanceMeters: Math.round(minDistance),
    currentSpeed: Math.round(currentSpeedKmh),
    isSpeeding,
    overspeedKmh,
  };
}
