const STORAGE_KEY = 'trackpro_notif_prefs';

export interface NotifPrefs {
  toast_geofence: boolean;
  toast_speed: boolean;
  dashboard_widget: boolean;
}

const DEFAULTS: NotifPrefs = {
  toast_geofence:    true,
  toast_speed:       true,
  dashboard_widget:  true,
};

export function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
