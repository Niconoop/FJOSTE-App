export interface GameMapWidgetHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  fitRoute: () => void;
  clearRoute: () => void;
  focusDestination: (lng: number, lat: number) => void;
  focusDestinationByGameCoords: (gx: number, gz: number) => void;
  setView: (lng: number, lat: number, zoom: number, bearing?: number) => void;
  getView: () => { center: [number, number]; zoom: number; bearing: number } | null;
}

export type MapTheme = 'dark' | 'light' | 'headlight';

export interface NearbyTrafficVehicle {
  id: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed?: number;
  width?: number;
  height?: number;
  length?: number;
  isTrailer?: boolean;
  isTmp?: boolean;
}

export interface NearbySemaphore {
  id: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  type: number; // 1 = traffic light, 2 = gate
  state: number; // 0 = off, 1 = orange_to_red, 2 = red, 4 = orange_to_green, 8 = green, 32 = sleep
  timeRemaining?: number;
}

