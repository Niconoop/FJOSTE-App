import * as proj4Module from 'proj4';

const proj4 = (proj4Module as any).default || proj4Module;

const earthRadiusMeters = 6_370_997;
export const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

export const ets2DefData = {
  mapProjection: 'lambert_conic',
  standardParalel1: 37,
  standardParalel2: 65,
  mapOrigin: [50, 15],
  mapOffset: [16660, 4150],
  mapFactor: [-0.000171570875, 0.0001729241463],
} as const;

export const ets2ProjectionString = [
  '+proj=lcc',
  `+R=${earthRadiusMeters}`,
  `+lat_1=${ets2DefData.standardParalel1}`,
  `+lat_2=${ets2DefData.standardParalel2}`,
  `+lat_0=${ets2DefData.mapOrigin[0]}`,
  `+lon_0=${ets2DefData.mapOrigin[1]}`,
].join(' ');

const fromWgs84ToEts2Converter = proj4(ets2ProjectionString);

/**
 * Projects game coordinates [gx, gz] (in ETS2 meter space) to WGS84 [lat, lng].
 */
export function projectGameToLatLng(gx: number, gz: number): [number, number] | null {
  if (gx == null || gz == null || isNaN(gx) || isNaN(gz)) return null;

  let x = gx;
  let y = gz;

  const sx = Math.floor(x / 4000);
  const sy = Math.floor(y / 4000);
  x -= ets2DefData.mapOffset[0];
  y -= ets2DefData.mapOffset[1];

  const ukScaleFactor = 0.75;
  const calais = [-31100, -5500];
  const isUk = sx <= -8 && sy <= -2 && !(sx === -8 && sy === -2);
  if (isUk) {
    x = (x + calais[0] / 2) * ukScaleFactor;
    y = (y + calais[1] / 2) * ukScaleFactor;
  }

  const lccCoords: [number, number] = [
    x * ets2DefData.mapFactor[1] * lengthOfDegree,
    y * ets2DefData.mapFactor[0] * lengthOfDegree,
  ];

  const [lng, lat] = fromWgs84ToEts2Converter.inverse(lccCoords);

  if (lat > 30 && lat < 75 && lng > -25 && lng < 55) {
    return [lat, lng];
  }

  return null;
}

/**
 * Projects game coordinates [gx, gz] to MapLibre / GeoJSON format [lng, lat].
 */
export function projectGameToLngLat(gx: number, gz: number): [number, number] | null {
  const res = projectGameToLatLng(gx, gz);
  if (!res) return null;
  return [res[1], res[0]];
}

/**
 * Projects WGS84 coordinates [lat, lng] back to ETS2 game coordinates [gx, gz].
 */
export function projectLatLngToGame(lat: number, lng: number): [number, number] {
  const unscaled = fromWgs84ToEts2Converter.forward([lng, lat]);
  let [x, y] = [
    unscaled[0] / ets2DefData.mapFactor[1] / lengthOfDegree,
    unscaled[1] / ets2DefData.mapFactor[0] / lengthOfDegree,
  ];

  const ukScaleFactor = 0.75;
  const calais = [-31100, -5500];
  const xIfUk = x / ukScaleFactor - calais[0] / 2 + ets2DefData.mapOffset[0];
  const yIfUk = y / ukScaleFactor - calais[1] / 2 + ets2DefData.mapOffset[1];
  const sx = Math.floor(xIfUk / 4000);
  const sy = Math.floor(yIfUk / 4000);
  const isUk = sx <= -8 && sy <= -2 && !(sx === -8 && sy === -2);

  if (isUk) {
    x = x / ukScaleFactor - calais[0] / 2;
    y = y / ukScaleFactor - calais[1] / 2;
  }

  return [
    Math.round(x + ets2DefData.mapOffset[0]),
    Math.round(y + ets2DefData.mapOffset[1]),
  ];
}
