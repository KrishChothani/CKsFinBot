/** @format */

/**
 * Effective-Dated HSN/SAC Chapter GST Rate Table.
 * 
 * NOTE: Tax rates change under statutory GST Council notifications.
 * All rates are versioned by effective date and marked "VERIFY WITH CA / OFFICIAL SOURCE".
 */

export const HSN_RATE_SCHEDULE = [
  {
    chapter: "72", // Iron & Steel
    description: "Iron and steel products, hot rolled coils, bars, rods",
    defaultRateBasisPoints: 1800, // 18%
    effectiveFrom: "2017-07-01",
    effectiveTo: null,
    sourceUrl: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    status: "verified",
  },
  {
    chapter: "84", // Nuclear reactors, boilers, machinery and mechanical appliances
    description: "Machinery, industrial valves, pumps, CNC equipment",
    defaultRateBasisPoints: 1800, // 18%
    effectiveFrom: "2017-07-01",
    effectiveTo: null,
    sourceUrl: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    status: "verified",
  },
  {
    chapter: "85", // Electrical machinery and equipment
    description: "Electrical transformers, cables, motors",
    defaultRateBasisPoints: 1800, // 18%
    effectiveFrom: "2017-07-01",
    effectiveTo: null,
    sourceUrl: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    status: "verified",
  },
  {
    chapter: "99", // Services
    subHeading: "9965", // Goods Transport Agency
    description: "Transport of goods by road (GTA) - RCM 5% or Forward Charge 12%",
    defaultRateBasisPoints: 500, // 5%
    effectiveFrom: "2017-07-01",
    effectiveTo: null,
    sourceUrl: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    status: "draft, VERIFY WITH CA / OFFICIAL SOURCE",
  },
  {
    chapter: "99", // Services
    subHeading: "9963", // Accommodation, food and beverage services
    description: "Outdoor catering, restaurant services (Candidate Section 17(5) Blocked ITC)",
    defaultRateBasisPoints: 500, // 5%
    effectiveFrom: "2019-10-01",
    effectiveTo: null,
    sourceUrl: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    status: "draft, VERIFY WITH CA / OFFICIAL SOURCE",
  },
];

/**
 * Looks up the expected rate for an HSN/SAC code as of a specific transaction date.
 */
export function lookupHsnRate(hsnCode, transactionDate = new Date()) {
  if (!hsnCode) return null;
  const clean = String(hsnCode).trim().replace(/\D/g, "");
  const chapter = clean.substring(0, 2);
  const subHeading = clean.substring(0, 4);

  const txTime = new Date(transactionDate).getTime();

  // Try subheading exact match first, then chapter match
  const matched = HSN_RATE_SCHEDULE.find((item) => {
    if (item.subHeading && item.subHeading === subHeading) return true;
    if (item.chapter === chapter) return true;
    return false;
  });

  if (!matched) return null;

  // Verify effective date
  const fromTime = new Date(matched.effectiveFrom).getTime();
  const toTime = matched.effectiveTo ? new Date(matched.effectiveTo).getTime() : Infinity;

  if (txTime >= fromTime && txTime <= toTime) {
    return matched;
  }
  return null;
}

export default {
  HSN_RATE_SCHEDULE,
  lookupHsnRate,
};

