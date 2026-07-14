const pool = require("../config/db");

const DEFAULT_SERVICE_OPTIONS = [
  { key: "AC_REPAIR", title: "AC Repair", desc: "AC repair, servicing, gas refill and cooling issues.", imageUrl: "", active: true },
  { key: "PLUMBING", title: "Water Line", desc: "Plumbing, leak fixing, line repair and bathroom work.", imageUrl: "", active: true },
  { key: "GAS_STOVE_REPAIR", title: "Gas Chula", desc: "Gas stove, burner and kitchen gas line support.", imageUrl: "", active: true },
  { key: "HOME_CLEANING", title: "Home Cleaning", desc: "Regular and deep home cleaning support.", imageUrl: "", active: true },
  { key: "HOME_ELECTRONICS", title: "Home Electronics", desc: "TV, fan, light, switch and electric line support.", imageUrl: "", active: true }
];

const DEFAULT_SITE_SETTINGS = {
  preferences: { language: "ENGLISH" },
  services: DEFAULT_SERVICE_OPTIONS,
  loginPages: {
    customer: {
      title: "Trusted home services, one login away.",
      description: "Book verified local professionals, discuss your work, and follow every payment and service update from one secure dashboard.",
      pointOne: "Verified service partners",
      pointTwo: "Transparent booking and payments",
      pointThree: "Track every job from your dashboard"
    },
    partner: {
      title: "Grow your service business with MistriChai.",
      description: "Connect with nearby customers, manage assigned work, receive approved payments, and keep your professional profile up to date.",
      pointOne: "Reach customers in your service area",
      pointTwo: "Manage jobs and availability",
      pointThree: "Track earnings and withdrawals"
    },
    admin: {
      title: "Keep the MistriChai platform running smoothly.",
      description: "Review partners, manage bookings and payments, maintain service categories, and oversee platform activity from one control center.",
      pointOne: "Partner and booking oversight",
      pointTwo: "Secure payment verification",
      pointThree: "Service and website management"
    }
  },
  home: {
    heroKicker: "Quality service at a fair price",
    heroTitle: "Specialized, efficient, and trusted home services",
    heroSubtitle:
      "Book verified technicians for AC and fridge repair, water line, gas line, cleaning, and home electronics with transparent booking, admin assignment, and direct customer-partner chat.",
    primaryButtonText: "Get Started Now",
    primaryButtonLink: "/services",
    secondaryButtonText: "View all Services",
    secondaryButtonLink: "/services",
    heroImageUrl: "",
    heroImageAlt: "Service professionals",
    badgeOne: "Verified Partners",
    badgeTwo: "Fast Booking",
    badgeThree: "Live Chat After Assign",
    stripOneTitle: "Secure Login",
    stripOneText: "Customer and Partner separate portals",
    stripTwoTitle: "Service Areas",
    stripTwoText: "District, Thana, Ward based filtering",
    stripThreeTitle: "Modern Workflow",
    stripThreeText: "Booking to Assign to Chat to Complete"
  },
  promo: {
    kicker: "Affordable cleaning solutions",
    title: "High-Quality and Friendly Services at Fair Prices",
    description:
      "We provide comprehensive cleaning services tailored to your needs. From residential cleaning services.",
    buttonText: "Get a quote",
    buttonLink: "/contact",
    leftImageUrl: "",
    rightImageUrl: ""
  },
  whyChoose: {
    kicker: "Why choose us",
    title: "Service you can trust, from booking to completion",
    description: "A safer and simpler way to find skilled help for your home.",
    itemOneTitle: "Verified professionals",
    itemOneText: "Partner identity and service information are reviewed before approval.",
    itemTwoTitle: "Clear service workflow",
    itemTwoText: "Track booking, assignment, chat, payment and completion from your dashboard.",
    itemThreeTitle: "Local and responsive",
    itemThreeText: "Find technicians by district, thana and ward with live availability status."
  },
  reviews: [
    { name: "Nusrat Jahan", role: "Customer", rating: "5", text: "The technician arrived on time and explained the repair clearly. The full process felt safe and simple." },
    { name: "Tanvir Ahmed", role: "Customer", rating: "5", text: "I found an available AC technician in my area quickly. Chat and payment updates were very helpful." },
    { name: "Farhana Islam", role: "Customer", rating: "5", text: "Booking was easy and the partner was professional. I could follow every step from my dashboard." },
    { name: "Mahmud Hasan", role: "Customer", rating: "4", text: "A clean and reliable service experience. The admin verification gave me extra confidence." },
    { name: "Sadia Rahman", role: "Customer", rating: "5", text: "The home cleaning service was excellent and communication with the partner was smooth." },
    { name: "Rakib Hossain", role: "Customer", rating: "5", text: "The location filter helped me find the right technician nearby without wasting time." },
    { name: "Mim Akter", role: "Customer", rating: "5", text: "Transparent payment status and fast support made the entire experience much better." }
  ],
  contact: {
    pageTitle: "Contact",
    pageSubtitle: "Send a message and our team will respond as soon as possible.",
    supportTitle: "Support Info",
    supportEmail: "support@mistrichai.com",
    supportPhone: "+880 1XXXXXXXXX",
    supportHours: "9:00 AM - 10:00 PM",
    supportAddress: "7510, Brand Tower, New York, USA",
    supportNote:
      "For booking-related issues, customers and partners can also use dashboard chat after assignment.",
    homeKicker: "Contact info",
    homeTitle: "Keep In Touch",
    homeDescription:
      "We prioritize responding to your inquiries promptly to ensure you receive the assistance you need in a timely manner."
  },
  about: {
    title: "About MistriChai",
    description:
      "MistriChai connects customers with verified service professionals. Our goal is to make home-service booking simple, trustworthy, and transparent.",
    missionTitle: "Mission",
    missionText: "Make local technician services safe, fast, and accessible for everyone.",
    visionTitle: "Vision",
    visionText:
      "Build a trusted service ecosystem with verified partners and strong customer support."
  }
};

let ensurePromise = null;

async function ensureTable() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          section_key VARCHAR(50) PRIMARY KEY,
          content_json LONGTEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      for (const [sectionKey, content] of Object.entries(DEFAULT_SITE_SETTINGS)) {
        await pool.query(
          "INSERT IGNORE INTO site_settings (section_key, content_json) VALUES (?, ?)",
          [sectionKey, JSON.stringify(content)]
        );
      }
    })();
  }

  return ensurePromise;
}

function sanitizeValue(value, fallback) {
  if (Array.isArray(fallback) && fallback.length > 0 && fallback[0]?.key && fallback[0]?.title) {
    return normalizeServices(value);
  }

  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : [...fallback];
  }

  if (fallback && typeof fallback === "object") {
    const source = value && typeof value === "object" ? value : {};
    const output = {};

    for (const key of Object.keys(fallback)) {
      output[key] = sanitizeValue(source[key], fallback[key]);
    }

    return output;
  }

  if (typeof fallback === "string") {
    return typeof value === "string" ? value.trim() : fallback;
  }

  return value ?? fallback;
}

function normalizeServiceKey(value, index = 1) {
  const cleaned = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `SERVICE_${index}`;
}

function normalizeServiceItem(item, index = 1) {
  const key = normalizeServiceKey(item?.key || item?.title, index);
  const title = String(item?.title || "").trim() || key.replace(/_/g, " ");
  const desc = String(item?.desc || "").trim() || `${title} service support.`;
  const imageUrl = String(item?.imageUrl || item?.image_url || "").trim();
  const active = ![false, 0, "0", "false", "inactive", "disabled"].includes(
    typeof item?.active === "string" ? item.active.trim().toLowerCase() : item?.active
  );
  return { key, title, desc, imageUrl, active };
}

function normalizeServices(input) {
  const source = Array.isArray(input) ? input : DEFAULT_SERVICE_OPTIONS;
  const seen = new Set();
  const output = [];

  for (let i = 0; i < source.length; i += 1) {
    const item = normalizeServiceItem(source[i], i + 1);
    if (seen.has(item.key)) {
      continue;
    }
    seen.add(item.key);
    output.push(item);
  }

  return output.length ? output : [...DEFAULT_SERVICE_OPTIONS];
}

function normalizeSettings(rows = []) {
  const saved = Object.fromEntries(
    rows.map((row) => {
      try {
        return [row.section_key, JSON.parse(row.content_json)];
      } catch (err) {
        return [row.section_key, {}];
      }
    })
  );

  const normalized = {};
  for (const [sectionKey, defaults] of Object.entries(DEFAULT_SITE_SETTINGS)) {
    normalized[sectionKey] = sanitizeValue(saved[sectionKey], defaults);
  }

  return normalized;
}

async function getAllSettings() {
  await ensureTable();
  const [rows] = await pool.query("SELECT section_key, content_json FROM site_settings");
  const settings = normalizeSettings(rows);
  if (settings.about?.title === "About EcoFix") settings.about.title = "About MistriChai";
  if (String(settings.about?.description || "").startsWith("EcoFix connects customers")) settings.about.description = DEFAULT_SITE_SETTINGS.about.description;
  if (settings.contact?.supportEmail === "support@ondemand.com") settings.contact.supportEmail = "support@mistrichai.com";
  return settings;
}

async function updateAllSettings(payload = {}) {
  await ensureTable();
  const current = await getAllSettings();

  for (const [sectionKey, defaults] of Object.entries(DEFAULT_SITE_SETTINGS)) {
    const merged = sanitizeValue(payload[sectionKey] ?? current[sectionKey], defaults);
    await pool.query(
      `INSERT INTO site_settings (section_key, content_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
      [sectionKey, JSON.stringify(merged)]
    );
  }

  return getAllSettings();
}

async function getServices() {
  const data = await getAllSettings();
  return normalizeServices(data.services);
}

async function setServices(services = []) {
  await ensureTable();
  const normalized = normalizeServices(services);
  await pool.query(
    `INSERT INTO site_settings (section_key, content_json)
     VALUES ('services', ?)
     ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
    [JSON.stringify(normalized)]
  );
  return normalized;
}

async function addService(payload = {}) {
  const current = await getServices();
  const item = normalizeServiceItem(payload, current.length + 1);
  const existingIndex = current.findIndex((x) => x.key === item.key);
  if (existingIndex >= 0 && current[existingIndex].active !== false) {
    throw new Error("Service key already exists");
  }
  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    current[existingIndex] = normalizeServiceItem({
      ...existing,
      ...payload,
      key: existing.key,
      imageUrl: String(payload.imageUrl || "").trim() || existing.imageUrl,
      active: true
    }, existingIndex + 1);
    await setServices(current);
    return current[existingIndex];
  }
  const next = [...current, item];
  await setServices(next);
  return item;
}

async function updateService(serviceKey, payload = {}) {
  const current = await getServices();
  const targetKey = normalizeServiceKey(serviceKey);
  const index = current.findIndex((item) => item.key === targetKey);
  if (index < 0) {
    return null;
  }

  const merged = normalizeServiceItem(
    {
      ...current[index],
      ...payload,
      key: targetKey
    },
    index + 1
  );
  current[index] = merged;
  await setServices(current);
  return merged;
}

async function deleteService(serviceKey) {
  const current = await getServices();
  const targetKey = normalizeServiceKey(serviceKey);
  const index = current.findIndex((item) => item.key === targetKey);
  if (index < 0 || current[index].active === false) {
    return false;
  }
  current[index] = { ...current[index], active: false };
  await setServices(current);
  return true;
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SERVICE_OPTIONS,
  getAllSettings,
  updateAllSettings,
  getServices,
  addService,
  updateService,
  deleteService
};
