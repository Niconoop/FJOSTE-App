// Open Pipe Club - Active Event Navigation Manager
import type { RouteWaypoint } from '../components/RoutePlanner';

export interface ActiveEventRoute {
  eventId: string | number;
  eventTitle: string;
  startCity: string;
  startCompany?: string;
  endCity: string;
  endCompany?: string;
  waypoints: RouteWaypoint[];
  gameCoords: [number, number][];
  distanceKm?: number;
  loadedAt: number;
}

const STORAGE_KEY = 'opc_active_event_route';
export const ACTIVE_ROUTE_CHANGED_EVENT = 'opc-active-route-changed';

export function getActiveEventRoute(): ActiveEventRoute | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getIpc(): any {
  if (typeof window === 'undefined') return null;
  try {
    if ((window as any).ipcRenderer) return (window as any).ipcRenderer;
    if ((window as any).require) return (window as any).require('electron')?.ipcRenderer;
  } catch {
    return null;
  }
  return null;
}

export function setActiveEventRoute(
  route: Omit<ActiveEventRoute, 'loadedAt' | 'gameCoords'> & { gameCoords?: [number, number][] }
): ActiveEventRoute | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const gameCoords =
      route.gameCoords && route.gameCoords.length > 0
        ? route.gameCoords
        : route.waypoints.map((w) => [w.gx, w.gz] as [number, number]);

    const fullRoute: ActiveEventRoute = {
      ...route,
      gameCoords,
      loadedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullRoute));
    window.dispatchEvent(new CustomEvent(ACTIVE_ROUTE_CHANGED_EVENT, { detail: fullRoute }));

    const ipc = getIpc();
    if (ipc) {
      ipc.send('rpc-set-active-convoy', {
        eventId: fullRoute.eventId,
        eventTitle: fullRoute.eventTitle,
        startCity: fullRoute.startCity,
        endCity: fullRoute.endCity,
      });
    }

    return fullRoute;
  } catch (err) {
    console.error('[activeNavigation] Failed to save active event route:', err);
    return null;
  }
}

export function clearActiveEventRoute(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(ACTIVE_ROUTE_CHANGED_EVENT, { detail: null }));

    const ipc = getIpc();
    if (ipc) {
      ipc.send('rpc-clear-active-convoy');
    }
  } catch (err) {
    console.error('[activeNavigation] Failed to clear active event route:', err);
  }
}
