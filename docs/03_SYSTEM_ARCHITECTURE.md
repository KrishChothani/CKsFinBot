# System Architecture & Technical Design (ADD)
## Project: CKsFinBot — Autonomous Accounting & Statutory Tax Advisory Platform

---

### Document Control
- **Document ID**: ARCH-CKSFINBOT-2026.1
- **Version**: 2.0.0
- **Status**: Approved & Baselined
- **Author**: Senior Full-Stack Fintech Architect

---

## 1. High-Level Architecture Overview

CKsFinBot employs a decoupled microservices architecture designed for resilience, strict tenant isolation, deterministic data integrity, and high-throughput document processing.

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client Layer (React 19 + Vite)"]
        UI["Web Application\n(Tailwind CSS 4 + Design Tokens)"]
        ReviewUI["Click-to-Source PDF Viewer\n(Coordinate Highlighting)"]
        PortalUI["Public Client Magic Intake Portal\n(Secure S3 Direct Upload)"]
    end

    subgraph APILayer["API Gateway & Application Services (Node.js Express)"]
        AuthMid["JWT & Multi-Tenant Middleware\n(firmId, clientId context scoping)"]
        DocController["Document Intake & Presigned S3 Handler"]
        ValEngine["Deterministic Validation Engine\n(Integer Paise & ISO/IEC 7064 MOD 36-2)"]
        ReconEngine["GSTR-2B 2-Tier Matching Engine\n(IMS Action Handler & Conservation Check)"]
        TallyService["Double-Entry Voucher & Tally XML Linter\n(MSME § 43B(h) statutory injector)"]
        AdvisoryService["Tax Advisory & MSME 45-Day Tracker\n(§ 40(a)(ia) TDS & § 40A(3) Cash Limits)"]
        MarketService["E-Commerce Settlement Engine\n(Amazon MTR & Flipkart GSTR-8 Decomposition)"]
        CloseService["Close-Readiness & Chasing Automation\n(5-Pillar Scorecard & WhatsApp webhook)"]
        QueueManager["BullMQ Job Dispatcher & Dead Letter Queue"]
    end

    subgraph AIService["AI & Extraction Microservice (Python FastAPI)"]
        FastAPIApp["FastAPI Service Layer"]
        TextExtractor["PDF Text-Layer Word Box Extractor\n(PyPDF Coordinate Geometry)"]
        OCRFallback["OCR Provider Abstraction Layer\n(Tesseract / Google Vision / Azure)"]
        LLMMapper["Gemini & LangChain Orchestrator\n(Taxonomy & Schema Mapping)"]
        MoneyEngine["Python Integer Paise Math Utility"]
    end

    subgraph DataStorage["Persistence & Messaging Infrastructure"]
        S3["AWS S3 Bucket\n(Tenant-isolated prefixes + KMS)"]
        Redis["Redis Cache & BullMQ Message Broker"]
        Mongo["MongoDB Atlas\n(Document Metadata, Configs, Logs)"]
        Postgres["PostgreSQL Double-Entry Ledger\n(Zero-Balance Constraint DB)"]
    end

    ClientLayer <-->|HTTPS / REST / WebSocket| APILayer
    APILayer -->|Async Jobs| Redis
    Redis -->|Worker Consumer| APILayer
    APILayer -->|Extract by Reference Request| AIService
    AIService -->|Stream Read / Write| S3
    APILayer -->|Store Documents & Metadata| Mongo
    APILayer -->|Balanced Vouchers & Audits| Postgres
    ClientLayer -->|Direct Encrypted Upload| S3
```

---

## 2. C4 Architecture Models

### 2.1 C4 Level 1: System Context Diagram

```mermaid
flowchart TD
    UserCA["Chartered Accountant / Partner\n(Reviews Practice Analytics & Dual-Control)"]
    UserBookkeeper["Bookkeeper / Article Trainee\n(Verifies click-to-source vouchers in Queue)"]
    UserSME["Client SME Owner\n(Uploads receipts via WhatsApp / Portal)"]

    CKsFinBotSystem["CKsFinBot Platform\n(Autonomous Accounting & Statutory Engine)"]

    GSTNPortal["GSTN Portal / GSP API\n(GSTR-2B Inward Data & IMS Actions)"]
    TallyERP["TallyPrime / ERP Systems\n(Double-Entry Accounting Software)"]
    WhatsAppCloud["WhatsApp Business Cloud API\n(Automated Chasing & Inbound Bills)"]

    UserCA -->|Approves high-value vouchers & monitors risk| CKsFinBotSystem
    UserBookkeeper -->|Reviews extracted line items & fixes flags| CKsFinBotSystem
    UserSME -->|Submits statements via magic link| CKsFinBotSystem

    CKsFinBotSystem -->|Fetches GSTR-2B JSON & syncs IMS| GSTNPortal
    CKsFinBotSystem -->|Exports balanced XML vouchers| TallyERP
    CKsFinBotSystem -->|Dispatches invoice chases & intake alerts| WhatsAppCloud
```

### 2.2 C4 Level 2: Container Diagram

```mermaid
flowchart TB
    subgraph Browser["Client Browser"]
        SPA["React 19 Single Page App\n(Vite, Tailwind CSS, Lucide, Framer Motion)"]
    end

    subgraph AppCluster["Application Tier"]
        NodeAPI["Node.js API Service\n(Express 4.21, Mongoose, BullMQ, pg)"]
        PythonAI["Python AI Service\n(FastAPI, PyPDF, Gemini, LangChain)"]
        Worker["Async Extraction Worker\n(BullMQ Worker Consumer)"]
    end

    subgraph StorageCluster["Data & Message Persistence"]
        RedisDB["Redis 7 (In-Memory Queue & Token Store)"]
        MongoDB["MongoDB 8.0 (Documents, Rules, Clients, Chat)"]
        PostgreSQL["PostgreSQL 16 (Ledgers, Double-Entry Lines, Audits)"]
        S3Storage["AWS S3 (Encrypted Documents & Previews)"]
    end

    SPA -->|REST API Calls (JWT)| NodeAPI
    NodeAPI -->|Dispatches Extraction Task| RedisDB
    RedisDB -->|Pulls Job| Worker
    Worker -->|Calls Extraction RPC| PythonAI
    PythonAI -->|Reads PDF Bytes| S3Storage
    Worker -->|Writes Extracted Coordinates| MongoDB
    NodeAPI -->|Executes Double-Entry Transactions| PostgreSQL
    NodeAPI -->|Generates Signed URLs| S3Storage
```

### 2.3 C4 Level 3: Component Diagram (Node.js Backend Architecture)

```mermaid
flowchart LR
    subgraph Ingestion["Ingestion Pipeline"]
        UploadCtrl["document.routes.js\n& upload.middleware"]
        DupService["duplicateDetector.service.js\n(SHA-256 + Canonical Key)"]
        DocQueue["documentExtraction.queue.js\n(BullMQ Producer)"]
    end

    subgraph Processing["Processing & Rules Core"]
        ValidatorEngine["validator.engine.js\n(Pure Invariant Functions)"]
        RulesRegistry["registry.json\n& rules.service.js"]
        MoneyUtil["money.js\n(Integer Paise Math Engine)"]
    end

    subgraph Accounting["Accounting & Export Engine"]
        VoucherService["voucher.service.js\n(Maker-Checker Logic)"]
        TallyExport["tallyExport.service.js\n(XML Generation)"]
        TallyLinter["tallyLinter.service.js\n(Polarity & Zero-Balance Guard)"]
    end

    UploadCtrl --> DupService --> DocQueue
    DocQueue --> ValidatorEngine
    ValidatorEngine --> RulesRegistry
    ValidatorEngine --> MoneyUtil
    ValidatorEngine --> VoucherService
    VoucherService --> TallyExport
    TallyExport --> TallyLinter
```

---

## 3. End-to-End Data & Event Flow

### 3.1 Document Ingestion & Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Bookkeeper / Client
    participant UI as React Frontend
    participant API as Node.js Backend
    participant S3 as AWS S3 Storage
    participant Queue as BullMQ (Redis)
    participant AI as Python AI Service
    participant Engine as Deterministic Validation Engine
    participant DB as MongoDB / PostgreSQL

    User->>UI: Uploads Invoice PDF / Image
    UI->>API: POST /api/v1/documents (Multi-tenant headers)
    API->>API: Compute SHA-256 File Hash & check duplicates
    API->>S3: Upload file with tenant prefix (firm/client/hash)
    API->>Queue: Push job into 'document-extraction' queue
    API-->>UI: 202 Accepted (Job ID & Document ID)

    Queue->>AI: Worker triggers extraction RPC
    AI->>S3: Stream document bytes
    AI->>AI: Extract text layer word boxes (PyPDF)
    opt If text layer sparse (<20 chars)
        AI->>AI: Fall back to OCR provider
    end
    AI->>AI: Map to canonical invoice schema (Gemini / LangChain)
    AI-->>Queue: Return raw text + bounding boxes + word IDs

    Queue->>Engine: Run Pure Validation Invariants
    Engine->>Engine: Integer paise arithmetic (Line sum == Taxable)
    Engine->>Engine: GSTIN Checksum (ISO/IEC 7064 MOD 36-2)
    Engine->>Engine: Check Place of Supply vs GSTIN state code
    Engine->>Engine: Lookup HSN rate in statutory registry
    Engine->>Engine: Scan Section 17(5) blocked credit keywords
    Engine->>DB: Save ExtractedData & Initial Draft Voucher
    DB-->>UI: WebSocket event: Document Ready for Review
```

### 3.2 GSTR-2B 2-Tier Reconciliation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor CA as Chartered Accountant
    participant UI as React Frontend
    participant Recon as gstRecon.service.js
    participant Rules as Rule Invariants
    participant DB as MongoDB / PostgreSQL

    CA->>UI: Uploads GSTR-2B JSON / Excel
    UI->>Recon: POST /api/v1/gst-recon/reconcile
    Recon->>DB: Fetch posted purchase vouchers for period
    Recon->>Rules: Tier-1 Exact Match (GSTIN + InvNo + Date + Amounts)
    Recon->>Rules: Tier-2 Assisted Fuzzy Match (Stripped punctuation + ₹1.00 tolerance)
    Recon->>Recon: Compute Conservation Check: Matched + Missing == Total
    Recon->>Recon: Compute ITC at Risk: Sum of tax on missing inward bills
    Recon->>DB: Save Gstr2bRecon audit snapshot
    Recon-->>UI: Return Categorized Summary & Supplier Breakdown
    CA->>UI: Selects IMS Actions (Accept / Reject / Pending)
    UI->>Recon: POST /api/v1/gst-recon/ims-actions
    Recon->>DB: Update IMS status with immutable timestamp
```

---

## 4. Subsystem Deep-Dive

### 4.1 Deterministic Validation Engine Subsystem
The engine executes **pure functions** without external I/O or side effects. It never relies on probabilistic LLM output for arithmetic, tax calculations, or checksums:

```mermaid
flowchart TD
    RawDoc["Extracted Invoice Data"] --> InvariantCheck{"Deterministic Rules Engine"}
    
    InvariantCheck --> C1["Arithmetic Invariant\nLine taxable sum == Voucher taxable\nTax == Rate * Taxable (paise tolerance)"]
    InvariantCheck --> C2["GSTIN Checksum Invariant\nISO/IEC 7064 MOD 36-2 verification\nSupplier & Buyer state codes"]
    InvariantCheck --> C3["Statutory Tax Split Invariant\nIntra-State: CGST + SGST (50/50 conservation)\nInter-State: IGST (100%)\nUT: UTGST + CGST"]
    InvariantCheck --> C4["HSN/SAC Rate Invariant\nEffective-dated rate table lookup\nFlag mismatches for human review"]
    InvariantCheck --> C5["Statutory Threshold Invariant\n§ 40A(3) Daily cash > ₹10,000 / ₹35,000\n§ 43B(h) MSME due date caps (15/45 days)\n§ 194C/J TDS threshold breaches"]

    C1 & C2 & C3 & C4 & C5 --> Aggregator["Result Aggregator"]
    Aggregator --> Output["Status per Rule: PASS / FAIL / WARNING / NOT_CHECKED\nwith Rule ID, Version, and Plain-Language Reason"]
```

### 4.2 Double-Entry Ledger Subsystem (TallyPrime Integration)
To ensure zero financial discrepancy, vouchers adhere to double-entry bookkeeping polarity rules:

```mermaid
classDiagram
    class TallyVoucher {
        +String voucherNumber
        +String voucherType
        +Date date
        +List ledgerEntries
        +validateBalance() Boolean
    }
    class LedgerEntry {
        +String ledgerName
        +Integer amountPaise
        +Boolean isDebit
        +Integer tallyAmount()
    }
    TallyVoucher "1" *-- "many" LedgerEntry : contains

    note for LedgerEntry "Tally Polarity Rule:\nDebit amounts are NEGATIVE\nCredit amounts are POSITIVE\nSum of all entries MUST EQUAL 0"
```

1. **Polarity Enforcement**:
   - Debit line item (Purchase / Expense / Input CGST / Input SGST): Formatted as `-125000` (Negative).
   - Credit line item (Sundry Creditor / Bank / Cash): Formatted as `+125000` (Positive).
   - Result: $\sum \text{Entry amounts} \equiv 0.00$.
2. **MSME Metadata Injection**:
   - Every Sundry Creditor entry is cross-referenced with `client.model.js`.
   - If vendor is Micro/Small, `<ISMSMEDECLARATION>Yes</ISMSMEDECLARATION>` and statutory due date are injected.
3. **Pre-Export Linter**:
   - Scans generated XML DOM.
   - Rejects export if any voucher is unbalanced or debit/credit polarities are inverted.

### 4.3 E-Commerce Marketplace Settlement Subsystem
Decouples complex marketplace remittance flat-files into clear double-entry accounting records:

```mermaid
flowchart LR
    SettlementCSV["Amazon MTR / Flipkart CSV"] --> Parser["Marketplace Settlement Parser"]
    Parser --> Decomp["Component Decomposition"]
    
    Decomp --> Rev["Gross Revenue (Cr)"]
    Decomp --> Ret["Customer Returns (Dr)"]
    Decomp --> Fees["Marketplace Fees (Dr)\n(Commission, Shipping, Pick & Pack)"]
    Decomp --> Taxes["Statutory Withholdings (Dr)\n(TCS § 52 + TDS § 194-O)"]
    Decomp --> Bank["Net Payable to Bank (Dr)"]

    Rev & Ret & Fees & Taxes & Bank --> Balancer["Zero-Balance Double-Entry Engine"]
    Balancer --> Voucher["Balanced Marketplace Journal Voucher"]
```

---

## 5. State Machine Specifications

### 5.1 Document Processing Lifecycle

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : File received & SHA-256 hashed
    UPLOADED --> QUEUED : Pushed to BullMQ
    QUEUED --> EXTRACTING : Worker claims job
    EXTRACTING --> EXTRACTED : Text & boxes mapped
    EXTRACTING --> EXTRACTION_FAILED : Parse / OCR error
    EXTRACTION_FAILED --> QUEUED : Auto-retry (max 3)
    EXTRACTION_FAILED --> DEAD_LETTER : Max retries exhausted

    EXTRACTED --> VALIDATING : Run Pure Invariants
    VALIDATING --> REVIEW_QUEUE : Initial voucher created
    REVIEW_QUEUE --> UNDER_REVIEW : Article trainee opens viewer
    UNDER_REVIEW --> PENDING_APPROVAL : Submitted (Maker completed)
    UNDER_REVIEW --> REJECTED : Invalid / Corrupted document
    
    PENDING_APPROVAL --> APPROVED : Dual-Control Checker signs off
    PENDING_APPROVAL --> UNDER_REVIEW : Checker requests corrections
    APPROVED --> POSTED : Exported to Tally / Ledger
    POSTED --> [*]
```

### 5.2 Dual-Control Maker-Checker Approval Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Voucher drafted
    DRAFT --> MAKER_SUBMITTED : Maker submits for sign-off

    state HighValueCheck <<choice>>
    MAKER_SUBMITTED --> HighValueCheck : Amount >= Threshold (₹1,00,000)

    HighValueCheck --> CHECKER_REVIEW : Yes (Dual control required)
    HighValueCheck --> AUTO_APPROVED : No (Below threshold & auto-policy on)

    CHECKER_REVIEW --> APPROVED : Checker confirms (Checker != Maker)
    CHECKER_REVIEW --> REVISION_REQUESTED : Checker notes discrepancy
    REVISION_REQUESTED --> DRAFT : Maker updates voucher

    APPROVED --> [*]
    AUTO_APPROVED --> [*]
```

---

## 6. Security & Multi-Tenancy Architecture

```mermaid
flowchart TD
    subgraph RequestContext["Incoming Request Context"]
        JWT["JWT Bearer Token\n(userId, firmId, userRole)"]
        ClientHeader["x-client-id Header\n(Active Client Entity)"]
    end

    RequestContext --> TenantGuard["tenantContext.middleware.js"]

    subgraph Enforcement["Database Isolation Boundary"]
        QueryInject["Query Predicate Injection\n{ firmId: req.firmId, clientId: req.clientId }"]
        S3Prefix["S3 Key Namespacing\ns3://bucket/firms/{firmId}/clients/{clientId}/{hash}.pdf"]
        DualControlGate["Segregation of Duties Check\nassert(checkerId !== makerId)"]
    end

    TenantGuard --> QueryInject
    TenantGuard --> S3Prefix
    TenantGuard --> DualControlGate
```

1. **Firm and Client Isolation**:
   - `firmId` defines the tenant practice (CA Firm or Business Group).
   - `clientId` defines the operating legal entity (SME client).
   - No query can execute without passing through `tenantContext.middleware.js`, which injects these filters into every MongoDB find/update and PostgreSQL query.
2. **Encrypted Storage Hierarchy**:
   - Files are stored with tenant-prefixed keys: `firms/{firmId}/clients/{clientId}/{year}/{hash}.pdf`.
   - Access is restricted exclusively to short-lived (15-minute) AWS S3 pre-signed URLs.
3. **Digital Provenance Hash Chains**:
   - Every mutation computes: $\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} + \text{Payload} + \text{AuthorID} + \text{Timestamp})$.
   - Tampering with historical records breaks the hash verification chain immediately.

