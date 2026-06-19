/**
 * Independent Auditor's Report — section model + standard (SA 700/705/706 ·
 * CARO 2020 · Companies Act 2013) paragraph templates used by the "Fill Standard"
 * actions. Field values are keyed strings stored in AuditReportState.fields.
 */

export type FieldType = "text" | "date" | "textarea" | "select";
export interface RField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  rows?: number;
  /** Standard-text generator (for textarea fields) given current field values. */
  std?: (f: Record<string, string>) => string;
}
export interface RSection {
  key: string;
  label: string;
  icon: string;
  note?: string;
  fields: RField[];
}

const company = (f: Record<string, string>) => f.companyName?.trim() || "[Company Name]";
const fyEnd = (f: Record<string, string>) => (f.fy?.trim() ? `31 March ${f.fy.match(/\d{4}(?!.*\d{4})/)?.[0] ?? ""}`.trim() : "31 March [YYYY]");

export const REPORT_SECTIONS: RSection[] = [
  {
    key: "cover", label: "Cover & Engagement", icon: "📋",
    note: "Engagement details auto-populate the report paragraphs and the signature block. Ensure CIN, FRN, Membership No. and UDIN are correct.",
    fields: [
      { key: "companyName", label: "Company / Auditee Name", type: "text", required: true, placeholder: "M/s ABC Private Limited" },
      { key: "cin", label: "CIN / Registration No.", type: "text", placeholder: "U12345MH2010PTC123456" },
      { key: "regOffice", label: "Registered Office Address", type: "text", placeholder: "Mumbai, Maharashtra" },
      { key: "fy", label: "Financial Year", type: "text", required: true, placeholder: "FY 2025–26 (01 Apr 2025 to 31 Mar 2026)" },
      { key: "entityNature", label: "Nature of Entity", type: "select", options: ["Private Limited", "Public Limited", "Listed", "Government Company", "Foreign Subsidiary"] },
      { key: "framework", label: "Applicable Framework", type: "select", options: ["Ind AS", "AS (Companies (Accounting Standards) Rules)", "IFRS"] },
      { key: "firmName", label: "Audit Firm Name", type: "text", required: true, placeholder: "M/s XYZ & Associates, Chartered Accountants" },
      { key: "frn", label: "Firm Registration No. (ICAI)", type: "text", placeholder: "123456W" },
      { key: "partner", label: "Engagement Partner", type: "text", required: true, placeholder: "CA Suresh Rao" },
      { key: "membershipNo", label: "Partner Membership No. (ICAI)", type: "text", placeholder: "012345" },
      { key: "reportDate", label: "Date of Report", type: "date", required: true },
      { key: "place", label: "Place of Signature", type: "text", placeholder: "Mumbai" },
    ],
  },
  {
    key: "addressee", label: "Addressee", icon: "📬",
    note: "SA 700 para 23 — typically addressed to the members/shareholders of the company.",
    fields: [
      { key: "addressee", label: "Report Addressed To", type: "textarea", rows: 2, required: true, placeholder: "To the Members of [Company Name]", std: (f) => `To the Members of ${company(f)}` },
    ],
  },
  {
    key: "opinion", label: "Opinion", icon: "⚖",
    fields: [
      { key: "opinion", label: "Opinion Paragraph", type: "textarea", rows: 8, required: true,
        std: (f) => `We have audited the accompanying financial statements of ${company(f)} ("the Company"), which comprise the Balance Sheet as at ${fyEnd(f)}, the Statement of Profit and Loss, the Statement of Changes in Equity and the Statement of Cash Flows for the year then ended, and notes to the financial statements, including a summary of material accounting policies and other explanatory information.\n\nIn our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give the information required by the Companies Act, 2013 ("the Act") in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of the Company as at ${fyEnd(f)}, and its profit (loss), the changes in equity and its cash flows for the year ended on that date.` },
      { key: "qualification", label: "Basis for Modification (Qualified / Adverse / Disclaimer)", type: "textarea", rows: 4,
        placeholder: "SA 705 — describe the matter giving rise to the modification; quantify the financial effect where practicable." },
      { key: "emphasis", label: "Emphasis of Matter (optional)", type: "textarea", rows: 3,
        placeholder: "SA 706 — draw attention to a matter fundamental to users' understanding, not giving rise to a modification." },
    ],
  },
  {
    key: "basis", label: "Basis for Opinion", icon: "📐",
    fields: [
      { key: "basis", label: "Basis for Opinion Paragraph", type: "textarea", rows: 7,
        std: () => `We conducted our audit in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Companies Act, 2013. Our responsibilities under those Standards are further described in the "Auditor's Responsibilities for the Audit of the Financial Statements" section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India together with the ethical requirements that are relevant to our audit of the financial statements under the provisions of the Act and the Rules thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.` },
      { key: "basisAdd", label: "Additional Basis Remarks (optional)", type: "textarea", rows: 3, placeholder: "e.g. We were appointed as statutory auditors at the AGM held on …" },
    ],
  },
  {
    key: "goingConcern", label: "Going Concern", icon: "🔄",
    fields: [
      { key: "gcStatus", label: "Going-Concern Assessment", type: "select", options: ["No material uncertainty — entity is a going concern", "Material uncertainty exists — disclosed in FS", "Entity is not a going concern"] },
      { key: "gcNote", label: "Material Uncertainty Note (if applicable)", type: "textarea", rows: 4,
        std: (f) => `We draw attention to Note [•] in the financial statements, which indicates [describe the events/conditions]. As stated in Note [•], these events or conditions indicate that a material uncertainty exists that may cast significant doubt on ${company(f)}'s ability to continue as a going concern. Our opinion is not modified in respect of this matter.` },
    ],
  },
  { key: "kam", label: "Key Audit Matters", icon: "🔑", note: "SA 701 — matters of most significance in the audit; add one card per KAM.", fields: [] },
  {
    key: "otherInfo", label: "Other Information", icon: "📎",
    fields: [
      { key: "otherInfo", label: "Other Information Paragraph", type: "textarea", rows: 5,
        std: () => `The Company's Board of Directors is responsible for the other information. The other information comprises the information included in the Board's Report including Annexures to the Board's Report, but does not include the financial statements and our auditor's report thereon. Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon. In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit, or otherwise appears to be materially misstated.` },
    ],
  },
  {
    key: "mgmtResp", label: "Management's Responsibilities", icon: "🏢",
    fields: [
      { key: "mgmtResp", label: "Responsibilities of Management & TCWG", type: "textarea", rows: 7,
        std: () => `The Company's Board of Directors is responsible for the matters stated in section 134(5) of the Companies Act, 2013 with respect to the preparation of these financial statements that give a true and fair view of the financial position, financial performance, changes in equity and cash flows of the Company in accordance with the accounting principles generally accepted in India. This responsibility also includes maintenance of adequate accounting records; selection and application of appropriate accounting policies; making judgements and estimates that are reasonable and prudent; and design, implementation and maintenance of adequate internal financial controls. In preparing the financial statements, management and the Board of Directors are responsible for assessing the Company's ability to continue as a going concern and using the going concern basis of accounting unless management either intends to liquidate the Company or to cease operations, or has no realistic alternative but to do so.` },
    ],
  },
  {
    key: "auditorResp", label: "Auditor's Responsibilities", icon: "🔍",
    fields: [
      { key: "auditorResp", label: "Auditor's Responsibilities Paragraph", type: "textarea", rows: 8,
        std: () => `Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that an audit conducted in accordance with SAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in the aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these financial statements. As part of an audit in accordance with SAs, we exercise professional judgement and maintain professional scepticism throughout the audit. We also evaluate the overall presentation, structure and content of the financial statements, and whether the financial statements represent the underlying transactions and events in a manner that achieves fair presentation.` },
    ],
  },
  {
    key: "caro", label: "CARO 2020", icon: "📋",
    fields: [
      { key: "caro", label: "Report on Other Legal & Regulatory Requirements (CARO)", type: "textarea", rows: 5,
        std: () => `As required by the Companies (Auditor's Report) Order, 2020 ("the Order") issued by the Central Government of India in terms of section 143(11) of the Act, we give in "Annexure B" a statement on the matters specified in paragraphs 3 and 4 of the Order, to the extent applicable. As required by section 143(3) of the Act, we report that we have sought and obtained all the information and explanations which to the best of our knowledge and belief were necessary for the purposes of our audit.` },
    ],
  },
  {
    key: "ifc", label: "Annexure A — IFC", icon: "📁",
    fields: [
      { key: "ifc", label: "Internal Financial Controls Opinion (Annexure A)", type: "textarea", rows: 5,
        std: (f) => `We have audited the internal financial controls with reference to financial statements of ${company(f)} ("the Company") as of ${fyEnd(f)} in conjunction with our audit of the financial statements of the Company for the year then ended. In our opinion, the Company has, in all material respects, an adequate internal financial controls system with reference to financial statements and such internal financial controls were operating effectively as at ${fyEnd(f)}, based on the criteria for internal financial control over financial reporting established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the ICAI.` },
    ],
  },
  {
    key: "signature", label: "Signature & UDIN", icon: "✍",
    note: "UDIN must be generated from the ICAI portal before filing. The report is signed by the engagement partner for and on behalf of the firm.",
    fields: [
      { key: "udin", label: "UDIN", type: "text", required: true, placeholder: "26012345AAAAAA0000" },
    ],
  },
];

export const OPINION_META: Record<string, { label: string; heading: string; basisHeading: string; icon: string; desc: string }> = {
  unmodified: { label: "Unmodified", heading: "Opinion", basisHeading: "Basis for Opinion", icon: "✅", desc: "Clean — true & fair view" },
  qualified: { label: "Qualified", heading: "Qualified Opinion", basisHeading: "Basis for Qualified Opinion", icon: "⚠", desc: "Material but not pervasive" },
  adverse: { label: "Adverse", heading: "Adverse Opinion", basisHeading: "Basis for Adverse Opinion", icon: "❌", desc: "Material & pervasive" },
  disclaimer: { label: "Disclaimer", heading: "Disclaimer of Opinion", basisHeading: "Basis for Disclaimer of Opinion", icon: "🚫", desc: "Unable to obtain evidence" },
};
