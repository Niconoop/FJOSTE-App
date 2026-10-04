/**
 * ETS2 Speed Camera Data & Proximity Engine
 * Directly extracted from vertices in ets2.geojson with road orientation vectors.
 */

export interface SpeedCamera {
  id: string;
  lat: number;
  lng: number;
  speedLimit: number;
  country: string;
  road: string;
  type: "gantry" | "pole" | "box";
  directionDeg?: number;
  bidirectional?: boolean;
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
    "type": "gantry",
    "directionDeg": 190.2
  },
  {
    "id": "de-a1-2",
    "lat": 51.002145,
    "lng": 6.992751,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A1 Köln Nord / Leverkusen",
    "type": "gantry",
    "directionDeg": 140.0
  },
  {
    "id": "de-a1-3",
    "lat": 53.06697,
    "lng": 8.809203,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A1 Bremer Kreuz",
    "type": "pole",
    "directionDeg": 309.6
  },
  {
    "id": "de-a1-4",
    "lat": 53.48527,
    "lng": 9.976696,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A1 Buchholzer Dreieck",
    "type": "gantry",
    "directionDeg": 57.0
  },
  {
    "id": "de-a2-1",
    "lat": 52.406402,
    "lng": 9.786752,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A2 Hannover Ost",
    "type": "gantry",
    "directionDeg": 343.0
  },
  {
    "id": "de-a2-2",
    "lat": 52.1372,
    "lng": 11.533938,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A2 Magdeburg Kreuz",
    "type": "pole",
    "directionDeg": 97.8
  },
  {
    "id": "de-a2-3",
    "lat": 51.563067,
    "lng": 7.666971,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A2 Kamener Kreuz",
    "type": "gantry",
    "directionDeg": 60.5
  },
  {
    "id": "de-a3-1",
    "lat": 50.05109,
    "lng": 8.572521,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A3 Frankfurter Kreuz",
    "type": "gantry",
    "directionDeg": 301.8
  },
  {
    "id": "de-a3-2",
    "lat": 49.483126,
    "lng": 11.060145,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A3 Nürnberg Nord",
    "type": "pole",
    "directionDeg": 267.5
  },
  {
    "id": "de-a3-3",
    "lat": 49.704495,
    "lng": 9.939711,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A3 Würzburg Biebelried",
    "type": "gantry",
    "directionDeg": 103.6
  },
  {
    "id": "de-a4-1",
    "lat": 51.050306,
    "lng": 13.741912,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A4 Dresden West",
    "type": "pole",
    "directionDeg": 108.2
  },
  {
    "id": "de-a4-2",
    "lat": 50.96669,
    "lng": 11.006934,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A4 Erfurt Ost",
    "type": "gantry",
    "directionDeg": 337.0
  },
  {
    "id": "de-a5-1",
    "lat": 49.458196,
    "lng": 8.509259,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A5 Heidelberg / Mannheim",
    "type": "gantry",
    "directionDeg": 31.3
  },
  {
    "id": "de-a5-2",
    "lat": 49.042972,
    "lng": 8.373705,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A5 Karlsruher Dreieck",
    "type": "pole",
    "directionDeg": 44.8
  },
  {
    "id": "de-a7-1",
    "lat": 53.490412,
    "lng": 9.905854,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A7 Hamburg Elbtunnel",
    "type": "gantry",
    "directionDeg": 121.4
  },
  {
    "id": "de-a7-2",
    "lat": 51.226952,
    "lng": 9.482211,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A7 Kasseler Berge",
    "type": "pole",
    "directionDeg": 266.4
  },
  {
    "id": "de-a7-3",
    "lat": 48.447506,
    "lng": 9.993469,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A7 Ulm / Elchingen",
    "type": "pole",
    "directionDeg": 71.5
  },
  {
    "id": "de-a8-1",
    "lat": 48.705795,
    "lng": 9.100678,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A8 Stuttgart Albaufstieg",
    "type": "pole",
    "directionDeg": 85.0
  },
  {
    "id": "de-a8-2",
    "lat": 48.169281,
    "lng": 11.419801,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A8 München Eschenried",
    "type": "gantry",
    "directionDeg": 229.3
  },
  {
    "id": "de-a9-1",
    "lat": 52.320434,
    "lng": 13.001483,
    "speedLimit": 100,
    "country": "Germany",
    "road": "A9 Dreieck Potsdam",
    "type": "gantry",
    "directionDeg": 93.1
  },
  {
    "id": "de-a9-2",
    "lat": 51.399479,
    "lng": 12.200408,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A9 Schkeuditzer Kreuz",
    "type": "pole",
    "directionDeg": 69.4
  },
  {
    "id": "de-a9-3",
    "lat": 49.485048,
    "lng": 11.128644,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A9 Nürnberg Ost",
    "type": "gantry",
    "directionDeg": 87.6
  },
  {
    "id": "de-a10-1",
    "lat": 52.589466,
    "lng": 13.552484,
    "speedLimit": 80,
    "country": "Germany",
    "road": "A10 Berliner Ring Ost",
    "type": "gantry",
    "directionDeg": 138.8
  },
  {
    "id": "de-a40-1",
    "lat": 51.472266,
    "lng": 6.786212,
    "speedLimit": 60,
    "country": "Germany",
    "road": "A40 Ruhrschnellweg Duisburg",
    "type": "box",
    "directionDeg": 97.6
  },
  {
    "id": "de-b1-1",
    "lat": 51.512385,
    "lng": 7.452712,
    "speedLimit": 50,
    "country": "Germany",
    "road": "B1 Dortmund Westfalenhallen",
    "type": "box",
    "directionDeg": 281.1
  },
  {
    "id": "fr-a1-1",
    "lat": 49.031157,
    "lng": 2.456147,
    "speedLimit": 90,
    "country": "France",
    "road": "A1 Paris Charles de Gaulle",
    "type": "gantry",
    "directionDeg": 92.1
  },
  {
    "id": "fr-a1-2",
    "lat": 50.597684,
    "lng": 3.035912,
    "speedLimit": 90,
    "country": "France",
    "road": "A1 Lille Sud",
    "type": "pole",
    "directionDeg": 183.9
  },
  {
    "id": "fr-a4-1",
    "lat": 49.112403,
    "lng": 4.087158,
    "speedLimit": 110,
    "country": "France",
    "road": "A4 Reims Contournement",
    "type": "pole",
    "directionDeg": 61.8
  },
  {
    "id": "fr-a4-2",
    "lat": 48.689441,
    "lng": 7.631516,
    "speedLimit": 90,
    "country": "France",
    "road": "A4 Strasbourg Nord",
    "type": "gantry",
    "directionDeg": 211.2
  },
  {
    "id": "fr-a6-1",
    "lat": 45.731182,
    "lng": 4.724371,
    "speedLimit": 70,
    "country": "France",
    "road": "A6 Tunnel de Fourvière",
    "type": "gantry",
    "directionDeg": 171.5
  },
  {
    "id": "fr-a7-1",
    "lat": 45.522726,
    "lng": 4.776892,
    "speedLimit": 90,
    "country": "France",
    "road": "A7 Lyon Sud Chasse",
    "type": "gantry",
    "directionDeg": 129.7
  },
  {
    "id": "fr-a7-2",
    "lat": 43.350374,
    "lng": 5.370263,
    "speedLimit": 90,
    "country": "France",
    "road": "A7 Marseille Entrée",
    "type": "pole",
    "directionDeg": 185.0
  },
  {
    "id": "fr-a10-1",
    "lat": 44.829073,
    "lng": -0.506039,
    "speedLimit": 90,
    "country": "France",
    "road": "A10 Bordeaux Rocade",
    "type": "gantry",
    "directionDeg": 217.5
  },
  {
    "id": "fr-a16-1",
    "lat": 50.891127,
    "lng": 1.841089,
    "speedLimit": 90,
    "country": "France",
    "road": "A16 Calais Port",
    "type": "pole",
    "directionDeg": 313.9
  },
  {
    "id": "fr-a61-1",
    "lat": 43.573257,
    "lng": 1.447047,
    "speedLimit": 90,
    "country": "France",
    "road": "A61 Toulouse Périphérique",
    "type": "gantry",
    "directionDeg": 253.2
  },
  {
    "id": "uk-m25-1",
    "lat": 51.559829,
    "lng": 0.140704,
    "speedLimit": 80,
    "country": "UK",
    "road": "M25 Dartford Crossing",
    "type": "gantry",
    "directionDeg": 305.0
  },
  {
    "id": "uk-m25-2",
    "lat": 51.479502,
    "lng": -0.484029,
    "speedLimit": 80,
    "country": "UK",
    "road": "M25 Heathrow Airport",
    "type": "gantry",
    "directionDeg": 171.0
  },
  {
    "id": "uk-m1-1",
    "lat": 51.613114,
    "lng": -0.371528,
    "speedLimit": 96,
    "country": "UK",
    "road": "M1 Luton / Watford",
    "type": "gantry",
    "directionDeg": 66.0
  },
  {
    "id": "uk-m1-2",
    "lat": 53.392961,
    "lng": -1.356173,
    "speedLimit": 80,
    "country": "UK",
    "road": "M1 Sheffield Smart Motorway",
    "type": "gantry",
    "directionDeg": 147.9
  },
  {
    "id": "uk-m6-1",
    "lat": 52.401283,
    "lng": -1.865802,
    "speedLimit": 80,
    "country": "UK",
    "road": "M6 Spaghetti Junction",
    "type": "gantry",
    "directionDeg": 276.6
  },
  {
    "id": "uk-m62-1",
    "lat": 53.589481,
    "lng": -2.290432,
    "speedLimit": 80,
    "country": "UK",
    "road": "M62 Manchester Ring",
    "type": "gantry",
    "directionDeg": 253.0
  },
  {
    "id": "uk-m20-1",
    "lat": 51.082653,
    "lng": 1.152938,
    "speedLimit": 80,
    "country": "UK",
    "road": "M20 Folkestone / Dover",
    "type": "pole",
    "directionDeg": 64.7
  },
  {
    "id": "uk-m8-1",
    "lat": 55.778376,
    "lng": -4.283385,
    "speedLimit": 80,
    "country": "UK",
    "road": "M8 Glasgow Kingston Bridge",
    "type": "gantry",
    "directionDeg": 284.7
  },
  {
    "id": "at-a1-1",
    "lat": 47.805256,
    "lng": 12.980406,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A1 Salzburg West",
    "type": "pole",
    "directionDeg": 272.3
  },
  {
    "id": "at-a1-2",
    "lat": 48.183111,
    "lng": 16.387486,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A23 Wien Südosttangente",
    "type": "gantry",
    "directionDeg": 60.9
  },
  {
    "id": "at-a12-1",
    "lat": 47.23105,
    "lng": 11.389091,
    "speedLimit": 100,
    "country": "Austria",
    "road": "A12 Inntal IG-L Radar",
    "type": "gantry",
    "directionDeg": 5.6
  },
  {
    "id": "at-a13-1",
    "lat": 47.172457,
    "lng": 11.399353,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A13 Brennerpass Europabrücke",
    "type": "pole",
    "directionDeg": 96.6
  },
  {
    "id": "at-a10-1",
    "lat": 47.656155,
    "lng": 13.168156,
    "speedLimit": 80,
    "country": "Austria",
    "road": "A10 Tauernautobahn",
    "type": "box",
    "directionDeg": 100.9
  },
  {
    "id": "ch-a1-1",
    "lat": 47.420514,
    "lng": 8.533038,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A1 Zürich Nordring",
    "type": "gantry",
    "directionDeg": 207.5
  },
  {
    "id": "ch-a1-2",
    "lat": 46.214371,
    "lng": 6.118277,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A1 Genève Aéroport",
    "type": "pole",
    "directionDeg": 123.0
  },
  {
    "id": "ch-a2-1",
    "lat": 46.731818,
    "lng": 8.565419,
    "speedLimit": 80,
    "country": "Switzerland",
    "road": "A2 Gotthard Nordportal",
    "type": "gantry",
    "directionDeg": 27.0
  },
  {
    "id": "it-a1-1",
    "lat": 45.447592,
    "lng": 9.209875,
    "speedLimit": 90,
    "country": "Italy",
    "road": "A1 Milano Sud Tangenziale",
    "type": "gantry",
    "directionDeg": 244.6
  },
  {
    "id": "it-a1-2",
    "lat": 44.592463,
    "lng": 11.232391,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A1 Bologna Casalecchio",
    "type": "gantry",
    "directionDeg": 127.1
  },
  {
    "id": "it-a1-3",
    "lat": 43.824572,
    "lng": 11.218478,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A1 Firenze Nord",
    "type": "pole",
    "directionDeg": 118.4
  },
  {
    "id": "it-a1-4",
    "lat": 41.997542,
    "lng": 12.533668,
    "speedLimit": 90,
    "country": "Italy",
    "road": "GRA Roma Ring Nord",
    "type": "gantry",
    "directionDeg": 103.3
  },
  {
    "id": "it-a4-1",
    "lat": 45.592585,
    "lng": 12.252165,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A4 Venezia Mestre",
    "type": "gantry",
    "directionDeg": 87.2
  },
  {
    "id": "it-a4-2",
    "lat": 45.227412,
    "lng": 7.731324,
    "speedLimit": 90,
    "country": "Italy",
    "road": "A4 Torino / Settimo Torinese",
    "type": "gantry",
    "directionDeg": 255.6
  },
  {
    "id": "it-a22-1",
    "lat": 45.374175,
    "lng": 10.849299,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A22 Autostrada del Brennero",
    "type": "pole",
    "directionDeg": 326.2
  },
  {
    "id": "it-a7-1",
    "lat": 44.47535,
    "lng": 8.865047,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A7 Genova Bolzaneto",
    "type": "gantry",
    "directionDeg": 19.4
  },
  {
    "id": "it-a3-1",
    "lat": 40.843852,
    "lng": 14.305398,
    "speedLimit": 80,
    "country": "Italy",
    "road": "A3 Napoli Tangenziale",
    "type": "gantry",
    "directionDeg": 173.2
  },
  {
    "id": "nl-a1-1",
    "lat": 52.380369,
    "lng": 4.919974,
    "speedLimit": 80,
    "country": "Netherlands",
    "road": "A10 Ring Amsterdam",
    "type": "gantry",
    "directionDeg": 201.0
  },
  {
    "id": "nl-a4-1",
    "lat": 51.915229,
    "lng": 4.518153,
    "speedLimit": 80,
    "country": "Netherlands",
    "road": "A4 Rotterdam Trajectcontrole",
    "type": "gantry",
    "directionDeg": 172.8
  },
  {
    "id": "be-e19-1",
    "lat": 51.178612,
    "lng": 4.415135,
    "speedLimit": 80,
    "country": "Belgium",
    "road": "R1 Antwerpen Ring",
    "type": "gantry",
    "directionDeg": 290.4
  },
  {
    "id": "be-e40-1",
    "lat": 50.890473,
    "lng": 4.386957,
    "speedLimit": 90,
    "country": "Belgium",
    "road": "R0 Ring Bruxelles",
    "type": "gantry",
    "directionDeg": 291.2
  },
  {
    "id": "be-e25-1",
    "lat": 50.621388,
    "lng": 5.557391,
    "speedLimit": 80,
    "country": "Belgium",
    "road": "E25 Liège Tunnel de Cointe",
    "type": "gantry",
    "directionDeg": 28.6
  },
  {
    "id": "pl-a2-1",
    "lat": 52.20696,
    "lng": 20.956253,
    "speedLimit": 80,
    "country": "Poland",
    "road": "S8 / S2 Warszawa Ring",
    "type": "gantry",
    "directionDeg": 353.4
  },
  {
    "id": "pl-a4-1",
    "lat": 51.049379,
    "lng": 16.965233,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A4 Wrocław Południe",
    "type": "pole",
    "directionDeg": 259.6
  },
  {
    "id": "pl-a4-2",
    "lat": 50.078899,
    "lng": 19.907033,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A4 Kraków Balice",
    "type": "gantry",
    "directionDeg": 101.3
  },
  {
    "id": "pl-a1-1",
    "lat": 54.283421,
    "lng": 18.596684,
    "speedLimit": 80,
    "country": "Poland",
    "road": "A1 Gdańsk / Rusocin",
    "type": "pole",
    "directionDeg": 71.0
  },
  {
    "id": "cz-d1-1",
    "lat": 50.037347,
    "lng": 14.481434,
    "speedLimit": 80,
    "country": "Czech Republic",
    "road": "D1 Praha Jih Chodov",
    "type": "gantry",
    "directionDeg": 179.6
  },
  {
    "id": "cz-d1-2",
    "lat": 49.164865,
    "lng": 16.526635,
    "speedLimit": 80,
    "country": "Czech Republic",
    "road": "D1 Brno Jih",
    "type": "pole",
    "directionDeg": 91.2
  },
  {
    "id": "sk-d1-1",
    "lat": 48.129838,
    "lng": 17.150994,
    "speedLimit": 90,
    "country": "Slovakia",
    "road": "D1 Bratislava Prístavný Most",
    "type": "gantry",
    "directionDeg": 1.7
  },
  {
    "id": "dk-e20-1",
    "lat": 55.646372,
    "lng": 12.486308,
    "speedLimit": 80,
    "country": "Denmark",
    "road": "E20 København Storebælt",
    "type": "gantry",
    "directionDeg": 136.3
  },
  {
    "id": "se-e4-1",
    "lat": 59.228902,
    "lng": 18.0047,
    "speedLimit": 70,
    "country": "Sweden",
    "road": "E4 Stockholm Essingeleden",
    "type": "gantry",
    "directionDeg": 91.0
  },
  {
    "id": "se-e6-1",
    "lat": 57.804385,
    "lng": 11.945133,
    "speedLimit": 70,
    "country": "Sweden",
    "road": "E6 Göteborg Tingstadstunneln",
    "type": "gantry",
    "directionDeg": 311.0
  },
  {
    "id": "se-e6-2",
    "lat": 55.545736,
    "lng": 13.025809,
    "speedLimit": 80,
    "country": "Sweden",
    "road": "E6 Malmö Ring",
    "type": "pole",
    "directionDeg": 251.6
  },
  {
    "id": "no-e6-1",
    "lat": 59.843308,
    "lng": 10.784106,
    "speedLimit": 70,
    "country": "Norway",
    "road": "E6 Oslo Operatunnelen",
    "type": "gantry",
    "directionDeg": 238.9
  },
  {
    "id": "no-e39-1",
    "lat": 60.384194,
    "lng": 5.357773,
    "speedLimit": 60,
    "country": "Norway",
    "road": "E39 Bergen Fløyfjellstunnel",
    "type": "box",
    "directionDeg": 204.4
  },
  {
    "id": "es-m30-1",
    "lat": 40.399129,
    "lng": -3.697271,
    "speedLimit": 70,
    "country": "Spain",
    "road": "M-30 Madrid Calle 30",
    "type": "gantry",
    "directionDeg": 193.5
  },
  {
    "id": "es-ap7-1",
    "lat": 41.415898,
    "lng": 2.105272,
    "speedLimit": 80,
    "country": "Spain",
    "road": "B-10 / B-20 Barcelona Ronda",
    "type": "gantry",
    "directionDeg": 266.2
  },
  {
    "id": "es-v30-1",
    "lat": 39.491516,
    "lng": -0.376495,
    "speedLimit": 90,
    "country": "Spain",
    "road": "V-30 Valencia Bypass",
    "type": "gantry",
    "directionDeg": 292.9
  },
  {
    "id": "es-se30-1",
    "lat": 37.398339,
    "lng": -5.986363,
    "speedLimit": 80,
    "country": "Spain",
    "road": "SE-30 Sevilla Ring",
    "type": "gantry",
    "directionDeg": 61.4
  },
  {
    "id": "pt-a1-1",
    "lat": 38.610865,
    "lng": -9.197561,
    "speedLimit": 80,
    "country": "Portugal",
    "road": "2ª Circular Lisboa",
    "type": "gantry",
    "directionDeg": 116.6
  },
  {
    "id": "pt-vci-1",
    "lat": 41.223246,
    "lng": -8.641908,
    "speedLimit": 80,
    "country": "Portugal",
    "road": "VCI Porto Ponte da Arrábida",
    "type": "gantry",
    "directionDeg": 72.0
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
        directionDeg: cam.directionDeg,
        sprite: 'speedcam_ico',
      },
    })),
  };
}

/**
 * Searches for approaching speed cameras strictly on the player's driving lane and direction.
 * Accurately filters out cameras on the Gegenfahrbahn (oncoming traffic) or opposite carriageway.
 * 
 * Checks performed:
 * 1. Monitored Travel Direction: Compares vehicle heading against the camera's monitored road direction (cam.directionDeg).
 *    Cameras monitoring the Gegenfahrbahn (~180° opposite) are rejected.
 * 2. Forward Field of View: Camera must be ahead in the vehicle's forward travel arc.
 * 3. Lateral / Cross-Track Position: Filters out cameras located across the median barrier on the oncoming carriageway.
 * 4. Route Path Consistency: When an active route polyline is provided, cameras not along the route are skipped.
 */
export function findApproachingSpeedcam(
  lat: number,
  lng: number,
  currentSpeedKmh: number,
  maxDistanceMeters: number = 750,
  headingDeg?: number,
  routeCoords?: [number, number][] | null
): SpeedcamAlertInfo | null {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  let closestCam: SpeedCamera | null = null;
  let minDistance = Infinity;

  const latKm = 111.0;
  const lngKm = 111.0 * Math.cos((lat * Math.PI) / 180);

  for (const cam of ETS2_SPEED_CAMERAS) {
    const dLat = (cam.lat - lat) * latKm;
    const dLng = (cam.lng - lng) * lngKm;
    const wgs84DistM = Math.sqrt(dLat * dLat + dLng * dLng) * 1000;
    // Map is 1:19 scale in ETS2: convert real-world WGS84 distance to in-game driving distance
    const distM = wgs84DistM / 19.0;

    if (distM > maxDistanceMeters) continue;

    if (headingDeg != null && !isNaN(headingDeg)) {
      // 1. Heading check: The camera's monitored direction MUST match our heading!
      // If the camera is on the Gegenfahrbahn (monitoring opposite traffic),
      // cam.directionDeg is ~180° away from our heading.
      if (cam.directionDeg != null && !isNaN(cam.directionDeg) && !cam.bidirectional) {
        let directionDiff = Math.abs(cam.directionDeg - headingDeg) % 360;
        if (directionDiff > 180) directionDiff = 360 - directionDiff;

        // If the direction differs by more than 55 degrees, this speed camera is monitoring the Gegenfahrbahn
        // (oncoming lane) or a cross-street!
        if (directionDiff > 55) {
          continue;
        }
      }

      // 2. Line of sight / approaching angle: Camera must be in front of our vehicle
      const bearingToCam = (Math.atan2(dLng, dLat) * (180 / Math.PI) + 360) % 360;
      let angleDiff = Math.abs(bearingToCam - headingDeg) % 360;
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // When approaching from a distance (> 25m), camera must be within forward arc (+/- 65°)
      if (distM > 25 && angleDiff > 65) {
        continue;
      }
      // When right alongside or just passed, ignore if camera is behind (> 100°)
      if (angleDiff > 100) {
        continue;
      }

      // 3. Lateral offset check: On multi-lane or dual carriageways,
      // in continental Europe (right-hand traffic), oncoming traffic (Gegenfahrbahn) is to our LEFT.
      // Cross-track distance: positive = to our right, negative = to our left.
      const headingRad = (headingDeg * Math.PI) / 180;
      const eastDistM = (dLng * 1000) / 19.0;
      const northDistM = (dLat * 1000) / 19.0;
      const crossTrackRightM = eastDistM * Math.cos(headingRad) - northDistM * Math.sin(headingRad);

      const isUk = cam.country === 'UK';
      // In Europe/ATS: Gegenfahrbahn is to our left (negative cross-track < -14m)
      // In UK: Gegenfahrbahn is to our right (positive cross-track > 14m)
      if (!isUk && crossTrackRightM < -14.0) {
        continue;
      }
      if (isUk && crossTrackRightM > 14.0) {
        continue;
      }
    }

    // 4. Optional active route check: if user is following a planned route,
    // verify camera is along the route path ahead
    if (routeCoords && routeCoords.length >= 2 && distM > 35) {
      let isNearRoute = false;
      const maxRouteDeviationM = 45; // max meters away from planned path
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const p1 = routeCoords[i];
        const p2 = routeCoords[i + 1];
        const segDist = Math.hypot(
          (cam.lat - (p1[1] || p1[0])) * latKm * 1000 / 19.0,
          (cam.lng - (p1[0] || p1[1])) * lngKm * 1000 / 19.0
        );
        if (segDist <= maxRouteDeviationM) {
          isNearRoute = true;
          break;
        }
      }
      if (!isNearRoute) {
        // Camera does not lie on our planned route (e.g. on straight motorway while we take an exit ramp)
        continue;
      }
    }

    if (distM < minDistance) {
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
