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
