/**
 * Per-GL "supporting document" upload specs.
 *
 * Each Balance-Sheet GL template gets an upload zone in its Lifecycle JEs tab,
 * tailored to the audit evidence that GL is actually substantiated by (a bank
 * sanction letter for Borrowings, a fixed-asset register for PPE, an ageing
 * schedule for Receivables, …). The uploaded file is sent to Claude, which
 * reads it and returns the `extracts` fields plus posting amounts that auto-fill
 * the journal entries — driving auto-generation of the GL.
 */

export interface SupportingDocSpec {
  /** Drop-zone heading, e.g. "Upload Bank Sanction Letter / Bank Certificate". */
  title: string;
  /** Accept attribute for the file input. */
  accept: string;
  /** Human label of the document types expected, shown under the heading. */
  docTypes: string;
  /** Fields Claude should auto-extract from the document. */
  extracts: string[];
  /** One-line "Expected:" hint shown inside the drop zone. */
  hint: string;
  /** Emoji shown in the drop zone. */
  icon: string;
}

const PDF_IMG_SHEET = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv";

export const SUPPORTING_DOCS: Record<string, SupportingDocSpec> = {
  "bs-ppe": {
    title: "Upload Fixed Asset Register / Purchase Invoices",
    accept: PDF_IMG_SHEET,
    docTypes: "Fixed Asset Register · Purchase Invoice · Capitalisation Sheet · Depreciation Schedule",
    extracts: ["Asset Description", "Date of Purchase", "Gross Block", "Accumulated Depreciation", "Net Block", "Depreciation for the Year", "Useful Life / Rate"],
    hint: "Expected: Asset · Date · Gross Block · Accum. Depn · Net Block · Depn for year",
    icon: "🏭",
  },
  "bs-rou": {
    title: "Upload Lease Agreement / ROU Schedule",
    accept: PDF_IMG_SHEET,
    docTypes: "Lease Agreement · ROU Asset Schedule · Lease Amortisation Sheet",
    extracts: ["Lessor", "Lease Term", "Lease Commencement", "Initial ROU Value", "Discount Rate", "Annual Lease Rental", "Accumulated Amortisation"],
    hint: "Expected: Lessor · Term · Commencement · ROU Value · Rate · Rentals",
    icon: "🏢",
  },
  "bs-intangibles": {
    title: "Upload Intangible Asset Register / Acquisition Agreement",
    accept: PDF_IMG_SHEET,
    docTypes: "Intangible Register · Acquisition Agreement · Amortisation Schedule",
    extracts: ["Asset Description", "Date of Acquisition", "Cost", "Accumulated Amortisation", "Net Carrying Amount", "Amortisation for the Year", "Useful Life"],
    hint: "Expected: Asset · Date · Cost · Accum. Amort · Carrying Amount",
    icon: "📄",
  },
  "bs-investments": {
    title: "Upload Demat / Portfolio / Fair Value Statement",
    accept: PDF_IMG_SHEET,
    docTypes: "Demat Holding Statement · Portfolio Valuation · Fair Value Report · Share Certificate",
    extracts: ["Investee / Security", "No. of Units / Shares", "Cost of Investment", "Fair Value", "Fair Value Gain / (Loss)", "Classification (FVTPL / FVOCI / Amortised)", "Income / Dividend"],
    hint: "Expected: Security · Units · Cost · Fair Value · Gain/Loss · Classification",
    icon: "💸",
  },
  "bs-ar": {
    title: "Upload Debtors Ageing / Balance Confirmations",
    accept: PDF_IMG_SHEET,
    docTypes: "Debtors Ageing · Balance Confirmation · Sales Ledger · Invoice",
    extracts: ["Customer", "Invoice / Outstanding Amount", "Ageing Bucket", "Total Receivables", "Provision for Doubtful Debts (ECL)", "Net Receivables"],
    hint: "Expected: Customer · Amount · Ageing · Total · ECL Provision · Net",
    icon: "💳",
  },
  "bs-inventory": {
    title: "Upload Stock Statement / Valuation Sheet",
    accept: PDF_IMG_SHEET,
    docTypes: "Stock Statement · Inventory Valuation · Physical Verification Sheet · Costing Sheet",
    extracts: ["Item / Category", "Quantity", "Rate (Cost)", "Net Realisable Value", "Cost Value", "NRV Value", "Write-down to NRV"],
    hint: "Expected: Item · Qty · Cost · NRV · Value · Write-down",
    icon: "📦",
  },
  "bs-cash": {
    title: "Upload Bank Statement / BRS / Cash Certificate",
    accept: PDF_IMG_SHEET,
    docTypes: "Bank Statement · Bank Reconciliation · Bank Certificate · Cash Count Sheet",
    extracts: ["Bank / Account", "Balance per Bank", "Balance per Books", "Unpresented Cheques", "Deposits in Transit", "Reconciled Balance", "Cash on Hand"],
    hint: "Expected: Bank · Bal per Bank · Bal per Books · Reconciling Items · Reconciled Bal",
    icon: "🏦",
  },
  "bs-prepaid": {
    title: "Upload Prepaid Expense Schedule / Invoices",
    accept: PDF_IMG_SHEET,
    docTypes: "Prepaid Schedule · Insurance / AMC Invoice · Amortisation Sheet",
    extracts: ["Expense Description", "Total Amount Paid", "Period Covered", "Amount Prepaid (unexpired)", "Charged to P&L", "Closing Prepaid"],
    hint: "Expected: Expense · Amount · Period · Prepaid · Charged to P&L",
    icon: "🧾",
  },
  "bs-borrowings": {
    title: "Upload Bank Sanction Letter / Bank Certificate",
    accept: PDF_IMG_SHEET,
    docTypes: "Bank Sanction Letter · Bank Certificate · Loan Agreement · Amortisation Schedule",
    extracts: ["Sanction Limit", "Drawing Power", "Rate of Interest", "Security / Collateral", "Covenants", "Expiry / Repayment Date", "Opening Balance", "Drawdowns", "Repayments", "Interest & Charges", "Closing Balance"],
    hint: "Expected: Limit · Rate · Drawing Power · Security · Covenants · Expiry · Balances",
    icon: "🏛",
  },
  "bs-ap": {
    title: "Upload Creditors Ageing / Supplier Statements",
    accept: PDF_IMG_SHEET,
    docTypes: "Creditors Ageing · Supplier Statement · Balance Confirmation · Purchase Ledger",
    extracts: ["Supplier", "Outstanding Amount", "Ageing Bucket", "Total Payables", "Disputed / Unreconciled", "MSME Dues"],
    hint: "Expected: Supplier · Amount · Ageing · Total Payables · MSME Dues",
    icon: "🛒",
  },
  "bs-loans": {
    title: "Upload Loan Agreement / Advances Schedule",
    accept: PDF_IMG_SHEET,
    docTypes: "Loan Agreement · Advances Ledger · Balance Confirmation",
    extracts: ["Borrower / Party", "Principal Amount", "Rate of Interest", "Repayment Terms", "Interest Accrued", "Closing Balance", "Provision (if any)"],
    hint: "Expected: Party · Principal · Rate · Terms · Interest · Balance",
    icon: "💼",
  },
  "bs-lease-liab": {
    title: "Upload Lease Agreement / Liability Amortisation",
    accept: PDF_IMG_SHEET,
    docTypes: "Lease Agreement · Lease Liability Schedule · Amortisation Sheet",
    extracts: ["Lessor", "Lease Term", "Discount Rate", "Opening Liability", "Lease Payments", "Interest on Lease Liability", "Closing Liability", "Current / Non-current Split"],
    hint: "Expected: Lessor · Term · Rate · Opening · Payments · Interest · Closing",
    icon: "📋",
  },
  "bs-rp-loans": {
    title: "Upload Related-Party Agreement / Confirmation",
    accept: PDF_IMG_SHEET,
    docTypes: "Related-Party Agreement · Board Resolution · Balance Confirmation · RPT Register",
    extracts: ["Related Party", "Relationship", "Nature of Transaction", "Amount", "Rate of Interest (if loan)", "Outstanding Balance", "Arm's-Length Basis"],
    hint: "Expected: Party · Relationship · Nature · Amount · Balance · Arm's-length",
    icon: "🤝",
  },
  "bs-dtl": {
    title: "Upload Deferred Tax Working / Computation",
    accept: PDF_IMG_SHEET,
    docTypes: "Deferred Tax Working · Tax Computation · WDV Reconciliation",
    extracts: ["Temporary Difference Item", "Book WDV / Carrying Amount", "Tax WDV / Tax Base", "Temporary Difference", "Tax Rate", "Deferred Tax Asset", "Deferred Tax Liability", "Net DTL / (DTA)"],
    hint: "Expected: Item · Book base · Tax base · Temp. diff · Rate · DTL/(DTA)",
    icon: "⚖️",
  },
  "bs-st-borrow": {
    title: "Upload Working-Capital Sanction / CC-OD Statement",
    accept: PDF_IMG_SHEET,
    docTypes: "CC / OD Sanction Letter · Working-Capital Statement · Bank Certificate",
    extracts: ["Facility Type (CC / OD / WCDL)", "Sanction Limit", "Drawing Power", "Rate of Interest", "Utilisation", "Security", "Closing Balance"],
    hint: "Expected: Facility · Limit · Drawing Power · Rate · Utilisation · Balance",
    icon: "💳",
  },
  "bs-tax-payable": {
    title: "Upload Tax Computation / Challans / Returns",
    accept: PDF_IMG_SHEET,
    docTypes: "Income-tax Computation · Advance-tax Challans · TDS / GST Returns · Assessment Order",
    extracts: ["Tax Type (Income Tax / GST / TDS)", "Total Tax Liability", "Advance Tax / TDS Paid", "Self-Assessment Tax", "Net Tax Payable", "Period / AY"],
    hint: "Expected: Tax type · Liability · Advance/TDS paid · Net payable · Period",
    icon: "🧾",
  },
  "bs-accrued": {
    title: "Upload Provision Working / Accrual Schedule",
    accept: PDF_IMG_SHEET,
    docTypes: "Provision Working · Accrual Schedule · Actuarial Report · Bonus / Gratuity Working",
    extracts: ["Provision / Accrual Item", "Basis of Estimate", "Opening Provision", "Charge for the Year", "Utilised / Reversed", "Closing Provision"],
    hint: "Expected: Item · Basis · Opening · Charge · Utilised · Closing",
    icon: "📌",
  },
};

export function supportingDocFor(id: string): SupportingDocSpec | undefined {
  return SUPPORTING_DOCS[id];
}
