/** Single source of truth for centre details used across the site. */

export const site = {
  name: "Hangeul Global Learning Center",
  shortName: "HGLC",
  nameKo: "한글 글로벌 학습 센터",
  tagline: {
    en: "Korean & English, taught properly — in Dhaka and online.",
    ko: "제대로 가르치는 한국어와 영어 — 다카 현장 수업과 온라인.",
  },
  address: {
    en: "Dhaka, Bangladesh",
    ko: "방글라데시 다카",
  },
  // Coordinates from the centre's Google Maps listing.
  geo: { lat: 23.7488333, lng: 90.38 },
  mapsUrl:
    "https://www.google.com/maps/place/Hangeul+Global+Learning+Center/@23.7488382,90.3774251,17z/data=!3m1!4b1!4m6!3m5!1s0xa71f18799c58213d:0xfc940dff932d7a04!8m2!3d23.7488333!4d90.38!16s%2Fg%2F11z8p9cvpn",
  mapsDirectionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=23.7488333,90.38&destination_place_id=ChIJPSFYnHkfH6cRBHot-f8NlPw",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+880 1XXX-XXXXXX",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@hglc.com.bd",
  hours: {
    en: "Saturday–Thursday · 9:00 AM – 8:30 PM · Friday closed",
    ko: "토–목 · 오전 9:00 – 오후 8:30 · 금요일 휴무",
  },
} as const;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const manualPaymentAccounts = {
  bkash: process.env.NEXT_PUBLIC_BKASH_NUMBER || "",
  nagad: process.env.NEXT_PUBLIC_NAGAD_NUMBER || "",
  bank: process.env.NEXT_PUBLIC_BANK_DETAILS || "",
};
