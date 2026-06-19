/**
 * Default GL row seeds for screen-3 (GL Line Items).
 * Sourced from HTML's `FS_DEFS` (auditflow-suite.html ~L51830-L51953).
 *
 * Each row carries an optional `templateId` linking to an Execution template;
 * when that template is signed off (Execution Variance Check tab), the
 * matching GL row in this list auto-flips to `completed = true` (the D1
 * back-flow). Rows without a templateId still work — they just can't be
 * auto-completed via Execution (user can manually toggle in the future).
 */

import type { S3FsId, S3GLRow } from "@/lib/types";
import { uid } from "@/lib/utils";

interface SeedRow {
  description: string;
  subDescription: string;
  accountCode: string;
  balance: string;
  referenceAmt?: string;
  templateId?: string;
}

interface SeedSection {
  section: string;
  rows: SeedRow[];
}

const BS_SECTIONS: SeedSection[] = [
  {
    section: "Non-Current Assets",
    rows: [
      { description: "Property, Plant & Equipment", subDescription: "Fixed Assets", accountCode: "1001", balance: "1,20,000", templateId: "bs-ppe" },
      { description: "Right-of-Use Assets", subDescription: "Lease Assets", accountCode: "1002", balance: "45,000", templateId: "bs-rou" },
      { description: "Intangible Assets", subDescription: "Goodwill & IP", accountCode: "1003", balance: "30,000", templateId: "bs-intangibles" },
      { description: "Long-Term Investments", subDescription: "Investments", accountCode: "1004", balance: "75,000", templateId: "bs-investments" },
    ],
  },
  {
    section: "Current Assets",
    rows: [
      { description: "Trade & Other Receivables", subDescription: "Debtors", accountCode: "2346", balance: "35,000", templateId: "bs-ar" },
      { description: "Inventory", subDescription: "Stock-in-Trade", accountCode: "2347", balance: "28,000", templateId: "bs-inventory" },
      { description: "Cash & Cash Equivalents", subDescription: "Bank & Cash", accountCode: "2348", balance: "15,000", templateId: "bs-cash" },
      { description: "Prepaid Expenses", subDescription: "Prepayments", accountCode: "2349", balance: "5,000", templateId: "bs-prepaid" },
    ],
  },
  {
    section: "Non-Current Liabilities",
    rows: [
      { description: "Term Loans", subDescription: "Long-term Borrowings", accountCode: "1789", balance: "80,000", templateId: "bs-borrowings" },
      { description: "Lease Liabilities", subDescription: "Finance Leases", accountCode: "2649", balance: "22,000", templateId: "bs-lease-liab" },
      { description: "Loans from Related Parties", subDescription: "Related Party", accountCode: "2346", balance: "18,000", templateId: "bs-rp-loans" },
      { description: "Deferred Tax Liability", subDescription: "Tax", accountCode: "3001", balance: "9,500", templateId: "bs-dtl" },
    ],
  },
  {
    section: "Current Liabilities",
    rows: [
      { description: "Trade & Other Payables", subDescription: "Creditors", accountCode: "4001", balance: "42,000", templateId: "bs-ap" },
      { description: "Short-Term Borrowings", subDescription: "Working Capital", accountCode: "4002", balance: "20,000", templateId: "bs-st-borrow" },
      { description: "Tax Payable", subDescription: "Current Tax", accountCode: "4003", balance: "7,200", templateId: "bs-tax-payable" },
      { description: "Accrued Expenses", subDescription: "Accruals", accountCode: "4004", balance: "6,800", templateId: "bs-accrued" },
    ],
  },
  {
    section: "Equity",
    rows: [
      { description: "Share Capital", subDescription: "Paid-up Capital", accountCode: "5001", balance: "1,00,000", templateId: "bs-share-capital" },
      { description: "Retained Earnings", subDescription: "Reserves", accountCode: "5002", balance: "68,500", templateId: "bs-retained" },
      { description: "Other Comprehensive Income", subDescription: "OCI", accountCode: "5003", balance: "4,000", templateId: "bs-oci" },
    ],
  },
];

const IL_SECTIONS: SeedSection[] = [
  {
    section: "Revenue",
    rows: [
      { description: "Revenue from Operations", subDescription: "Core Revenue", accountCode: "2607", balance: "80,000", referenceAmt: "45,000", templateId: "pl-revenue" },
      { description: "Other Operating Income", subDescription: "Other Income", accountCode: "2568", balance: "45,000", referenceAmt: "25,000", templateId: "pl-other-income" },
      { description: "Interest Income", subDescription: "Finance Income", accountCode: "2570", balance: "5,000", referenceAmt: "5,000", templateId: "pl-interest-income" },
    ],
  },
  {
    section: "Cost of Goods Sold (COGS)",
    rows: [
      { description: "Cost of Goods Sold", subDescription: "Direct Costs", accountCode: "2534", balance: "25,000", referenceAmt: "20,000", templateId: "pl-cogs" },
      { description: "Gross Profit", subDescription: "GP Line", accountCode: "2535", balance: "55,000", referenceAmt: "25,000" },
    ],
  },
  {
    section: "Employee Benefit Expenses",
    rows: [
      { description: "Salaries & Wages", subDescription: "Payroll", accountCode: "5243", balance: "12,000", referenceAmt: "10,000", templateId: "pl-payroll" },
      { description: "Provident Fund Contribution", subDescription: "PF / ESI", accountCode: "5244", balance: "1,440", referenceAmt: "1,200" },
      { description: "Gratuity Expense", subDescription: "Retirement Benefit", accountCode: "5245", balance: "600", referenceAmt: "500", templateId: "pl-gratuity" },
    ],
  },
  {
    section: "Other Operating Expenses",
    rows: [
      { description: "Other Operating Expenses", subDescription: "Overheads", accountCode: "5167", balance: "8,000", referenceAmt: "7,500", templateId: "pl-other-exp" },
      { description: "Depreciation & Amortisation", subDescription: "D&A", accountCode: "5168", balance: "4,500", referenceAmt: "4,500", templateId: "pl-depreciation" },
      { description: "Finance Cost", subDescription: "Interest Expense", accountCode: "5169", balance: "2,800", referenceAmt: "3,000", templateId: "pl-finance-cost" },
    ],
  },
  {
    section: "Tax & Profit",
    rows: [
      { description: "Profit Before Tax", subDescription: "PBT", accountCode: "6001", balance: "27,700", referenceAmt: "19,300" },
      { description: "Income Tax Expense", subDescription: "Current + Deferred", accountCode: "6002", balance: "8,500", referenceAmt: "6,000", templateId: "pl-tax" },
      { description: "Profit After Tax", subDescription: "PAT / Net Income", accountCode: "6003", balance: "19,200", referenceAmt: "13,300" },
    ],
  },
];

const CF_SECTIONS: SeedSection[] = [
  {
    section: "Cash Flows from Operating Activities (Direct Method)",
    rows: [
      { description: "Cash Received from Customers", subDescription: "Operating Inflow", accountCode: "7001", balance: "1,25,000", referenceAmt: "1,10,000", templateId: "cf-receipts" },
      { description: "Cash Paid to Suppliers", subDescription: "Operating Outflow", accountCode: "7002", balance: "52,000", referenceAmt: "48,000", templateId: "cf-suppliers" },
      { description: "Cash Paid to Employees", subDescription: "Payroll Outflow", accountCode: "7003", balance: "14,000", referenceAmt: "12,500" },
      { description: "Cash Paid for Operating Expenses", subDescription: "Overhead Outflow", accountCode: "7004", balance: "9,500", referenceAmt: "8,000" },
      { description: "Income Tax Paid", subDescription: "Tax Outflow", accountCode: "7005", balance: "7,200", referenceAmt: "6,000" },
      { description: "Net Cash from Operating Activities", subDescription: "Subtotal", accountCode: "7006", balance: "42,300", referenceAmt: "35,500" },
    ],
  },
  {
    section: "Cash Flows from Investing Activities",
    rows: [
      { description: "Purchase of Fixed Assets", subDescription: "Capex", accountCode: "7101", balance: "18,000", referenceAmt: "15,000", templateId: "cf-capex" },
      { description: "Proceeds from Asset Disposal", subDescription: "Disposals", accountCode: "7102", balance: "3,500", referenceAmt: "4,000" },
      { description: "Purchase of Investments", subDescription: "Investment Outflow", accountCode: "7103", balance: "10,000", referenceAmt: "10,000" },
      { description: "Net Cash from Investing Activities", subDescription: "Subtotal", accountCode: "7104", balance: "24,500", referenceAmt: "21,000" },
    ],
  },
  {
    section: "Cash Flows from Financing Activities",
    rows: [
      { description: "Proceeds from Borrowings", subDescription: "Debt Raised", accountCode: "7201", balance: "20,000", referenceAmt: "20,000", templateId: "cf-borrow" },
      { description: "Repayment of Loans", subDescription: "Debt Repaid", accountCode: "7202", balance: "12,000", referenceAmt: "10,000" },
      { description: "Dividends Paid", subDescription: "Distributions", accountCode: "7203", balance: "5,000", referenceAmt: "5,000" },
      { description: "Net Cash from Financing Activities", subDescription: "Subtotal", accountCode: "7204", balance: "3,000", referenceAmt: "5,000" },
    ],
  },
  {
    section: "Net Movement in Cash",
    rows: [
      { description: "Net Increase / (Decrease) in Cash", subDescription: "Total Movement", accountCode: "7301", balance: "20,800", referenceAmt: "19,500" },
      { description: "Opening Cash & Cash Equivalents", subDescription: "Prior Period", accountCode: "7302", balance: "15,000", referenceAmt: "14,000" },
      { description: "Closing Cash & Cash Equivalents", subDescription: "Current Period", accountCode: "7303", balance: "35,800", referenceAmt: "33,500" },
    ],
  },
];

const EQ_SECTIONS: SeedSection[] = [
  {
    section: "Opening Balances",
    rows: [
      { description: "Opening Share Capital", subDescription: "Paid-up Capital", accountCode: "8001", balance: "1,00,000", referenceAmt: "1,00,000" },
      { description: "Opening Retained Earnings", subDescription: "Prior Year", accountCode: "8002", balance: "55,000", referenceAmt: "55,000" },
      { description: "Opening Other Reserves", subDescription: "All Reserves", accountCode: "8003", balance: "12,000", referenceAmt: "12,000" },
    ],
  },
  {
    section: "Movements During Period",
    rows: [
      { description: "Profit for the Period", subDescription: "PAT Transfer", accountCode: "8101", balance: "19,200", referenceAmt: "13,300" },
      { description: "Other Comprehensive Income", subDescription: "OCI Movements", accountCode: "8102", balance: "1,500", referenceAmt: "1,200", templateId: "eq-oci" },
      { description: "Dividends Declared", subDescription: "Appropriation", accountCode: "8103", balance: "5,000", referenceAmt: "5,000", templateId: "eq-dividends" },
      { description: "Issue of New Shares", subDescription: "Capital Raise", accountCode: "8104", balance: "10,000", referenceAmt: "", templateId: "eq-share-issue" },
      { description: "Share Buyback", subDescription: "Capital Reduction", accountCode: "8105", balance: "", referenceAmt: "" },
    ],
  },
  {
    section: "Closing Balances",
    rows: [
      { description: "Closing Share Capital", subDescription: "Paid-up Capital", accountCode: "8201", balance: "1,10,000", referenceAmt: "1,00,000" },
      { description: "Closing Retained Earnings", subDescription: "Closing", accountCode: "8202", balance: "70,200", referenceAmt: "63,300" },
      { description: "Closing Total Equity", subDescription: "Net Equity", accountCode: "8203", balance: "1,93,700", referenceAmt: "1,75,500" },
    ],
  },
];

const ALL_FS: { fsId: S3FsId; sections: SeedSection[] }[] = [
  { fsId: "bs", sections: BS_SECTIONS },
  { fsId: "il", sections: IL_SECTIONS },
  { fsId: "cf", sections: CF_SECTIONS },
  { fsId: "eq", sections: EQ_SECTIONS },
];

export function defaultS3GLRows(): S3GLRow[] {
  const rows: S3GLRow[] = [];
  for (const fs of ALL_FS) {
    for (const sec of fs.sections) {
      for (const r of sec.rows) {
        rows.push({
          id: uid("glr"),
          fsId: fs.fsId,
          section: sec.section,
          description: r.description,
          subDescription: r.subDescription,
          accountCode: r.accountCode,
          balance: r.balance,
          referenceAmt: r.referenceAmt ?? "",
          inScope: false,
          testingAreas: { a: false, b: false, c: false },
          testingDue: "",
          reviewer: "",
          reviewDue: "",
          team: "",
          completed: false,
          completionDate: "",
          signedOffBy: "",
          templateId: r.templateId,
        });
      }
    }
  }
  return rows;
}

/** Get the unique list of section labels in display order for one FS. */
export function s3SectionsFor(fsId: S3FsId): string[] {
  const found = ALL_FS.find((f) => f.fsId === fsId);
  if (!found) return [];
  return found.sections.map((s) => s.section);
}

export const S3_FS_META: Record<S3FsId, { icon: string; name: string; shortName: string; accent: string }> = {
  bs: { icon: "🏦", name: "Balance Sheet", shortName: "Balance Sheet", accent: "blue" },
  il: { icon: "📈", name: "Income & Loss Statement", shortName: "Income & Loss", accent: "green" },
  cf: { icon: "💵", name: "Cashflow Statement", shortName: "Cashflow", accent: "teal" },
  eq: { icon: "⚖️", name: "Statement of Changes in Equity", shortName: "Equity Changes", accent: "purple" },
};
