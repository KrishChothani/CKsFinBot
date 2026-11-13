# app/schemas/extraction_models.py
"""
Pydantic schemas for deterministic structured financial extraction and validation.
Used by Gemini structured output mode and the tax validation engine.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class LineItemSchema(BaseModel):
    description: str = Field(description="Description of the goods or services")
    hsnCode: Optional[str] = Field(default=None, description="Harmonized System of Nomenclature (HSN) or SAC code")
    quantity: Optional[float] = Field(default=1.0, description="Quantity of items")
    unit: Optional[str] = Field(default="NOS", description="Unit of measurement (e.g., NOS, PCS, KG, HRS)")
    rate: Optional[float] = Field(default=0.0, description="Unit rate or price per item before tax")
    taxableAmount: Optional[float] = Field(default=0.0, description="Taxable value before GST")
    gstRate: Optional[float] = Field(default=18.0, description="Applicable GST rate percentage (e.g. 5, 12, 18, 28)")
    cgstAmount: Optional[float] = Field(default=0.0, description="Central GST amount")
    sgstAmount: Optional[float] = Field(default=0.0, description="State/UT GST amount")
    igstAmount: Optional[float] = Field(default=0.0, description="Integrated GST amount for inter-state")
    cessAmount: Optional[float] = Field(default=0.0, description="Cess amount if applicable")
    totalAmount: Optional[float] = Field(default=0.0, description="Total amount for this line item")
    confidence: Optional[float] = Field(default=0.9, description="Extraction confidence score for this line item (0 to 1)")

class InvoiceExtractionSchema(BaseModel):
    documentType: str = Field(
        default="Purchase_Invoice", 
        description="Type of document: Purchase_Invoice, Sales_Invoice, Expense_Bill, Credit_Note, Debit_Note"
    )
    invoiceNumber: Optional[str] = Field(default=None, description="Invoice or bill reference number")
    invoiceDate: Optional[str] = Field(default=None, description="Date of invoice in YYYY-MM-DD format")
    dueDate: Optional[str] = Field(default=None, description="Payment due date in YYYY-MM-DD format")
    placeOfSupply: Optional[str] = Field(default=None, description="Place of Supply state code or name, e.g. '24-Gujarat'")
    currency: Optional[str] = Field(default="INR", description="Three-letter currency code (INR, USD, etc.)")
    
    # Supplier (Vendor / Seller) Details
    supplierName: Optional[str] = Field(default=None, description="Legal or trade name of the supplier")
    supplierGstin: Optional[str] = Field(default=None, description="15-character GSTIN of the supplier")
    supplierPan: Optional[str] = Field(default=None, description="10-character PAN of the supplier")
    supplierAddress: Optional[str] = Field(default=None, description="Full billing address of the supplier")
    
    # Customer (Recipient / Buyer) Details
    customerName: Optional[str] = Field(default=None, description="Legal or trade name of the customer")
    customerGstin: Optional[str] = Field(default=None, description="15-character GSTIN of the customer")
    customerAddress: Optional[str] = Field(default=None, description="Billing address of the customer")
    
    # Items and Totals
    lineItems: List[LineItemSchema] = Field(default_factory=list, description="List of invoiced line items")
    subTotal: Optional[float] = Field(default=0.0, description="Sum of taxable amounts of all items")
    totalCgst: Optional[float] = Field(default=0.0, description="Total CGST across all items")
    totalSgst: Optional[float] = Field(default=0.0, description="Total SGST across all items")
    totalIgst: Optional[float] = Field(default=0.0, description="Total IGST across all items")
    totalCess: Optional[float] = Field(default=0.0, description="Total Cess across all items")
    roundOff: Optional[float] = Field(default=0.0, description="Round-off adjustment amount (+/-)")
    grandTotal: Optional[float] = Field(default=0.0, description="Final payable invoice amount")
    
    # Meta / Confidence
    confidenceScores: Dict[str, float] = Field(default_factory=dict, description="Field-level extraction confidence scores")

class BankTransactionSchema(BaseModel):
    date: Optional[str] = Field(default=None, description="Transaction date in YYYY-MM-DD format")
    narration: str = Field(description="Description, remarks, or transfer narration")
    referenceNumber: Optional[str] = Field(default=None, description="Cheque number, UTR, UPI ref, or transaction ID")
    debit: Optional[float] = Field(default=0.0, description="Withdrawal or debit amount")
    credit: Optional[float] = Field(default=0.0, description="Deposit or credit amount")
    balance: Optional[float] = Field(default=0.0, description="Running ledger balance after transaction")

class BankStatementExtractionSchema(BaseModel):
    documentType: str = Field(default="Bank_Statement", description="Type of document: Bank_Statement")
    bankName: Optional[str] = Field(default=None, description="Name of the bank, e.g. HDFC Bank, ICICI Bank, SBI")
    accountNumber: Optional[str] = Field(default=None, description="Bank account number or masked account number")
    ifscCode: Optional[str] = Field(default=None, description="11-character Indian Financial System Code (IFSC)")
    accountHolderName: Optional[str] = Field(default=None, description="Account holder entity or individual name")
    openingBalance: Optional[float] = Field(default=0.0, description="Opening balance at start of statement period")
    closingBalance: Optional[float] = Field(default=0.0, description="Closing balance at end of statement period")
    periodStart: Optional[str] = Field(default=None, description="Start date of statement period in YYYY-MM-DD")
    periodEnd: Optional[str] = Field(default=None, description="End date of statement period in YYYY-MM-DD")
    transactions: List[BankTransactionSchema] = Field(default_factory=list, description="Chronological statement transactions")
    confidenceScores: Dict[str, float] = Field(default_factory=dict, description="Field-level extraction confidence scores")

class StructuredExtractionRequest(BaseModel):
    documentId: str
    s3Url: str
    documentTypeHint: Optional[str] = "Auto"
    clientGstin: Optional[str] = None
    clientStateCode: Optional[str] = None
    webhookUrl: Optional[str] = None

class ValidationResultSchema(BaseModel):
    isMathValid: bool = True
    isGstinChecksumValid: bool = True
    hasTaxMismatch: bool = False
    errors: List[str] = []
    warnings: List[str] = []

class StructuredExtractionResponse(BaseModel):
    documentId: str
    documentType: str
    extractionConfidence: float
    invoiceData: Optional[InvoiceExtractionSchema] = None
    bankData: Optional[BankStatementExtractionSchema] = None
    validationResults: ValidationResultSchema
    rawTextPreview: Optional[str] = None

