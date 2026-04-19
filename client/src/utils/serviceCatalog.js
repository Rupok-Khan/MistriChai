export const DEFAULT_SERVICE_OPTIONS = [
  { key: "AC_REPAIR", title: "AC Repair", desc: "AC repair, servicing, gas refill and cooling issues.", imageUrl: "" },
  { key: "PLUMBING", title: "Water Line", desc: "Plumbing, leak fixing, line repair and bathroom work.", imageUrl: "" },
  { key: "GAS_STOVE_REPAIR", title: "Gas Chula", desc: "Gas stove, burner and kitchen gas line support.", imageUrl: "" },
  { key: "HOME_CLEANING", title: "Home Cleaning", desc: "Regular and deep home cleaning support.", imageUrl: "" },
  { key: "HOME_ELECTRONICS", title: "Home Electronics", desc: "TV, fan, light, switch and electric line support.", imageUrl: "" }
];

export const SERVICE_OPTIONS = DEFAULT_SERVICE_OPTIONS;

export function normalizeServiceOptions(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_SERVICE_OPTIONS;
  }

  const normalized = input
    .map((item) => {
      const key = String(item?.key || "").trim().toUpperCase();
      const title = String(item?.title || "").trim();
      const desc = String(item?.desc || "").trim();
      const imageUrl = String(item?.imageUrl || item?.image_url || "").trim();
      if (!key || !title) {
        return null;
      }
      return {
        key,
        title,
        desc: desc || title,
        imageUrl
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return DEFAULT_SERVICE_OPTIONS;
  }

  const unique = [];
  const seen = new Set();
  for (const item of normalized) {
    if (seen.has(item.key)) {
      continue;
    }
    seen.add(item.key);
    unique.push(item);
  }

  return unique;
}

export function buildServiceLabelMap(options) {
  return normalizeServiceOptions(options).reduce((acc, item) => {
    acc[item.key] = item.title;
    return acc;
  }, {});
}

export const SERVICE_LABELS = DEFAULT_SERVICE_OPTIONS.reduce((acc, item) => {
  acc[item.key] = item.title;
  return acc;
}, {});
