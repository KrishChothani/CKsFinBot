/** @format */

/**
 * Independent Indian GSTIN Validator & Checksum Engine.
 * Implements ISO/IEC 7064 MOD 36-2 checksum calculation.
 */

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CHAR_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHAR_MAP = new Map(CHAR_SET.split("").map((c, i) => [c, i]));

export const INDIAN_STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
  "97": "Other Territory",
};

/**
 * Calculates the expected 15th checksum character using ISO/IEC 7064 MOD 36-2 algorithm.
 */
export function calculateGstinChecksum(gstin14) {
  if (!gstin14 || gstin14.length !== 14) {
    return null;
  }

  const clean = gstin14.toUpperCase();
  let total = 0;

  for (let i = 0; i < 14; i++) {
    const char = clean[i];
    const val = CHAR_MAP.get(char);
    if (val === undefined) return null;

    const factor = i % 2 === 1 ? 2 : 1;
    const product = val * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    total += quotient + remainder;
  }

  const remainder = total % 36;
  const checkVal = (36 - remainder) % 36;
  return CHAR_SET[checkVal];
}

/**
 * Validates GSTIN structure, state code, PAN component, and checksum.
 */
export function validateGstin(gstin) {
  if (!gstin || typeof gstin !== "string") {
    return {
      isValid: false,
      isChecksumValid: false,
      reason: "GSTIN is missing or empty.",
    };
  }

  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return {
      isValid: false,
      isChecksumValid: false,
      reason: `GSTIN must be exactly 15 characters, received ${clean.length}.`,
    };
  }

  if (!GSTIN_REGEX.test(clean)) {
    return {
      isValid: false,
      isChecksumValid: false,
      reason: "Invalid GSTIN format: does not conform to statutory 15-character alphanumeric schema.",
    };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = INDIAN_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      isChecksumValid: false,
      stateCode,
      reason: `Invalid State Code prefix '${stateCode}'. Not recognized under Indian GST master.`,
    };
  }

  const pan = clean.substring(2, 12);
  const expectedChecksum = calculateGstinChecksum(clean.substring(0, 14));
  const actualChecksum = clean[14];
  const isChecksumValid = expectedChecksum === actualChecksum;

  if (!isChecksumValid) {
    return {
      isValid: false,
      isChecksumValid: false,
      stateCode,
      stateName,
      pan,
      expectedChecksum,
      actualChecksum,
      reason: `GSTIN checksum mismatch: 15th character is '${actualChecksum}', but MOD 36-2 algorithm calculates '${expectedChecksum}'.`,
    };
  }

  return {
    isValid: true,
    isChecksumValid: true,
    gstin: clean,
    stateCode,
    stateName,
    pan,
    expectedChecksum,
    actualChecksum,
    reason: "Valid GSTIN format and checksum verified.",
  };
}

export default {
  validateGstin,
  calculateGstinChecksum,
  INDIAN_STATE_CODES,
};

