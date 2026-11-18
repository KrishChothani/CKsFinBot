# app/services/tax_validator.py
"""
Deterministic Indian Tax, GSTIN, and Arithmetic Validation Engine.
CRITICAL FINTECH RULE: No LLM halluncination for calculations.
All totals, tax splits, line-item multiplications, and checksums are executed in pure deterministic code.
"""

import re
from typing import Dict, Any, List, Optional, Tuple

GSTIN_CHAR_MAP = {c: i for i, c in enumerate("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

INDIAN_STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
    "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh", "97": "Other Territory"
}

def calculate_gstin_checksum(gstin_14: str) -> Optional[str]:
    """
    Computes the 15th checksum character of a 14-character GSTIN string
    using the ISO/IEC 7064 MOD 36-2 algorithm with alternating weights (1, 2).
    """
    if len(gstin_14) != 14:
        return None
    try:
        total = 0
        for i, char in enumerate(gstin_14.upper()):
            val = GSTIN_CHAR_MAP.get(char, 0)
            factor = 2 if (i % 2 == 1) else 1
            product = val * factor
            quotient = product // 36
            remainder = product % 36
            total += quotient + remainder

        remainder = total % 36
        check_val = (36 - remainder) % 36
        inv_map = {v: k for k, v in GSTIN_CHAR_MAP.items()}
        return inv_map.get(check_val)
    except Exception:
        return None

def validate_gstin(gstin: Optional[str]) -> Dict[str, Any]:
    """
    Validates an Indian GSTIN format, state code, PAN component, and checksum.
    Returns validation status and extracted metadata.
    """
    if not gstin or not isinstance(gstin, str):
        return {
            "isValid": False,
            "error": "GSTIN not provided",
            "stateCode": None,
            "pan": None
        }

    clean_gstin = gstin.strip().upper()
    if not GSTIN_REGEX.match(clean_gstin):
        return {
            "isValid": False,
            "error": "Invalid GSTIN format (must be 15 alphanumeric characters matching standard pattern)",
            "stateCode": clean_gstin[:2] if len(clean_gstin) >= 2 else None,
            "pan": clean_gstin[2:12] if len(clean_gstin) >= 12 else None
        }

    state_code = clean_gstin[:2]
    pan = clean_gstin[2:12]
    expected_check = calculate_gstin_checksum(clean_gstin[:14])
    is_checksum_valid = expected_check == clean_gstin[14]

    state_name = INDIAN_STATE_CODES.get(state_code, "Unknown State")

    return {
        "isValid": True,
        "isChecksumValid": is_checksum_valid,
        "gstin": clean_gstin,
        "stateCode": state_code,
        "stateName": state_name,
        "pan": pan,
        "expectedChecksum": expected_check,
        "actualChecksum": clean_gstin[14]
    }

def validate_invoice_arithmetic(
    invoice_dict: Dict[str, Any], 
    client_state_code: Optional[str] = None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Performs complete deterministic validation on invoice line items, tax split, and grand total.
    Returns: (enriched_invoice_dict, validation_results)
    """
    errors: List[str] = []
    warnings: List[str] = []
    is_math_valid = True
    has_tax_mismatch = False

    # Extract supplier GSTIN and state
    supplier_gstin = invoice_dict.get("supplierGstin")
    gstin_res = validate_gstin(supplier_gstin)
    supplier_state = gstin_res.get("stateCode")

    if supplier_gstin and not gstin_res.get("isValid"):
        warnings.append(f"Supplier GSTIN format error: {gstin_res.get('error')}")

    # Determine Intra-State vs Inter-State supply
    is_inter_state = False
    if supplier_state and client_state_code:
        is_inter_state = (supplier_state != client_state_code)
    elif invoice_dict.get("placeOfSupply"):
        pos = str(invoice_dict.get("placeOfSupply"))[:2]
        if client_state_code and pos.isdigit():
            is_inter_state = (pos != client_state_code)

    # Process and validate line items
    line_items = invoice_dict.get("lineItems") or []
    calc_subtotal = 0.0
    calc_total_cgst = 0.0
    calc_total_sgst = 0.0
    calc_total_igst = 0.0
    calc_total_cess = 0.0

    for idx, item in enumerate(line_items):
        qty = float(item.get("quantity") or 1.0)
        rate = float(item.get("rate") or 0.0)
        taxable = float(item.get("taxableAmount") or 0.0)
        gst_rate = float(item.get("gstRate") or 18.0)
        
        # If taxable amount wasn't provided or differs from qty * rate
        expected_taxable = round(qty * rate, 2)
        if rate > 0 and abs(expected_taxable - taxable) > 0.10:
            warnings.append(
                f"Line item {idx + 1} ('{item.get('description', '')[:20]}'): "
                f"Qty ({qty}) * Rate ({rate}) = {expected_taxable}, but extracted taxable is {taxable}."
            )
            # Reconcile to mathematically valid taxable if close
            if taxable <= 0:
                taxable = expected_taxable
                item["taxableAmount"] = taxable

        calc_subtotal += taxable

        # Calculate GST split deterministically
        tax_val = round(taxable * (gst_rate / 100.0), 2)
        if is_inter_state:
            item["igstAmount"] = tax_val
            item["cgstAmount"] = 0.0
            item["sgstAmount"] = 0.0
            calc_total_igst += tax_val
        else:
            half_tax = round(tax_val / 2.0, 2)
            item["cgstAmount"] = half_tax
            item["sgstAmount"] = half_tax
            item["igstAmount"] = 0.0
            calc_total_cgst += half_tax
            calc_total_sgst += half_tax

        cess = float(item.get("cessAmount") or 0.0)
        calc_total_cess += cess

        # Line item total
        item["totalAmount"] = round(taxable + item["cgstAmount"] + item["sgstAmount"] + item["igstAmount"] + cess, 2)

    # Summary Totals Validation
    calc_subtotal = round(calc_subtotal, 2)
    calc_total_cgst = round(calc_total_cgst, 2)
    calc_total_sgst = round(calc_total_sgst, 2)
    calc_total_igst = round(calc_total_igst, 2)
    calc_total_cess = round(calc_total_cess, 2)

    extracted_subtotal = float(invoice_dict.get("subTotal") or 0.0)
    extracted_grand_total = float(invoice_dict.get("grandTotal") or 0.0)
    round_off = float(invoice_dict.get("roundOff") or 0.0)

    # If subtotal missing, fill calculated
    if extracted_subtotal <= 0:
        invoice_dict["subTotal"] = calc_subtotal
    elif abs(extracted_subtotal - calc_subtotal) > 0.50:
        errors.append(f"Subtotal mismatch: Line items sum to {calc_subtotal}, but extracted is {extracted_subtotal}.")
        is_math_valid = False

    # Synchronize tax totals
    invoice_dict["totalCgst"] = calc_total_cgst
    invoice_dict["totalSgst"] = calc_total_sgst
    invoice_dict["totalIgst"] = calc_total_igst
    invoice_dict["totalCess"] = calc_total_cess

    calculated_grand_total = round(calc_subtotal + calc_total_cgst + calc_total_sgst + calc_total_igst + calc_total_cess + round_off, 2)

    if extracted_grand_total <= 0:
        invoice_dict["grandTotal"] = calculated_grand_total
    elif abs(extracted_grand_total - calculated_grand_total) > 0.50:
        # Check if difference is just rounding off
        diff = round(extracted_grand_total - calculated_grand_total, 2)
        if abs(diff) <= 2.0:
            invoice_dict["roundOff"] = diff
            warnings.append(f"Applied round-off correction of {diff} to match invoice grand total.")
        else:
            errors.append(f"Grand Total mismatch: Calculated {calculated_grand_total}, but extracted is {extracted_grand_total}.")
            is_math_valid = False
            has_tax_mismatch = True

    validation_results = {
        "isMathValid": is_math_valid,
        "isGstinChecksumValid": gstin_res.get("isChecksumValid", False),
        "hasTaxMismatch": has_tax_mismatch,
        "isInterState": is_inter_state,
        "errors": errors,
        "warnings": warnings,
        "calculatedTotals": {
            "subTotal": calc_subtotal,
            "totalCgst": calc_total_cgst,
            "totalSgst": calc_total_sgst,
            "totalIgst": calc_total_igst,
            "grandTotal": calculated_grand_total
        }
    }

    return invoice_dict, validation_results

