export function getDeviceId() {
  if (typeof window === "undefined") return null;
  const key = "taraform:device_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  window.localStorage.setItem(key, id);
  return id;
}

