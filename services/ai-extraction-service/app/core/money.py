# app/core/money.py
"""
Money Utility for Python AI Service — Correctness-First Integer Paise Engine.

FINTECH NON-NEGOTIABLES:
1. Money is NEVER a float. All monetary amounts are stored as integer paise (1 INR = 100 paise).
2. Explicit rounding modes (HALF_UP and HALF_EVEN).
3. The LLM never performs arithmetic. Deterministic code calculates all totals and tax splits.
4. Conservation of paise: cgst_paise + sgst_paise + igst_paise + cess_paise === total_tax_paise.
"""

from decimal import Decimal, ROUND_HALF_UP, ROUND_HALF_EVEN
from typing import Dict, Any, Union
from enum import Enum

class RoundingMode(str, Enum):
    HALF_UP = "HALF_UP"
    HALF_EVEN = "HALF_EVEN"

def to_paise(rupees_input: Union[int, float, str, Decimal, None], rounding_mode: RoundingMode = RoundingMode.HALF_UP) -> int:
    """
    Converts any rupee representation into exact integer paise using high-precision Decimal arithmetic.
    e.g. 1500.50 -> 150050 paise
    """
    if rupees_input is None or rupees_input == "":
        return 0

    clean_str = str(rupees_input).strip().replace(",", "").replace("₹", "")
    if clean_str == "":
        return 0

    d = Decimal(clean_str)
    paise_decimal = d * Decimal(100)
    
    decimal_mode = ROUND_HALF_UP if rounding_mode == RoundingMode.HALF_UP else ROUND_HALF_EVEN
    rounded_paise = paise_decimal.to_integral_value(rounding=decimal_mode)
    return int(rounded_paise)

def to_rupees(paise: int) -> str:
    """
    Converts integer paise to standard Rupee string representation with 2 decimal places.
    e.g. 150050 -> "1500.50"
    """
    if not isinstance(paise, int):
        raise TypeError(f"paise must be an int, received: {type(paise)}")
    
    sign = "-" if paise < 0 else ""
    abs_paise = abs(paise)
    rupees = abs_paise // 100
    rem = abs_paise % 100
    return f"{sign}{rupees}.{rem:02d}"

def multiply_paise(paise: int, basis_points: int, rounding_mode: RoundingMode = RoundingMode.HALF_UP) -> int:
    """
    Multiplies integer paise by a rate in basis points (1% = 100 bps).
    e.g. 18% on ₹1,000 (100000 paise): multiply_paise(100000, 1800) -> 18000 paise (₹180.00).
    """
    if not isinstance(paise, int) or not isinstance(basis_points, int):
        raise TypeError("paise and basis_points must be integers")
    
    p = Decimal(paise)
    bp = Decimal(basis_points)
    product = (p * bp) / Decimal(10000)
    
    decimal_mode = ROUND_HALF_UP if rounding_mode == RoundingMode.HALF_UP else ROUND_HALF_EVEN
    return int(product.to_integral_value(rounding=decimal_mode))

def split_gst_tax(
    taxable_paise: int,
    gst_rate_basis_points: int,
    is_inter_state: bool = False,
    cess_basis_points: int = 0
) -> Dict[str, int]:
    """
    Splits GST tax deterministically with ZERO lost paise.
    Intra-state: Split evenly into CGST and SGST. If odd paise, CGST gets the remainder.
    Inter-state: 100% IGST.
    """
    if not isinstance(taxable_paise, int):
        raise TypeError("taxable_paise must be an integer")
    
    total_gst_paise = multiply_paise(taxable_paise, gst_rate_basis_points, RoundingMode.HALF_UP)
    cess_paise = multiply_paise(taxable_paise, cess_basis_points, RoundingMode.HALF_UP) if cess_basis_points > 0 else 0

    if is_inter_state:
        return {
            "cgst_paise": 0,
            "sgst_paise": 0,
            "igst_paise": total_gst_paise,
            "cess_paise": cess_paise,
            "total_tax_paise": total_gst_paise + cess_paise
        }
    
    half_tax = total_gst_paise // 2
    rem = total_gst_paise % 2
    cgst = half_tax + rem
    sgst = half_tax

    return {
        "cgst_paise": cgst,
        "sgst_paise": sgst,
        "igst_paise": 0,
        "cess_paise": cess_paise,
        "total_tax_paise": cgst + sgst + cess_paise
    }

