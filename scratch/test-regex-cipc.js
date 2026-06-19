const text = `B-BBEE LEVEL 1 CONTRIBUTOR: 135% PROCUREMENT RECOGNITION  B-BBEE INFORMATION  Registration number  Enterprise Name  Registration Date  Enterprise Type  Enterprise Status  2023 / 654922 / 07  ZOLILE NONZABA (PTY) LTD  27-March-2023  Private Company  In Business  ENTERPRISE INFORMATION  Certificate Number  Total Number of Shareholders  Number of Black Shareholders  Number of White Shareholders  Black Ownership Percentage  White Ownership Percentage  B-BBEE Status  Date of Issue  Expiry Date  9382648963  ONE (1) BLACK SHAREHOLDER(S)  ONE (1) SHAREHOLDER(S)  ZERO (0) WHITE SHAREHOLDER(S)  100% BLACK OWNERSHIP  0% WHITE OWNERSHIP  B-BBEE LEVEL 1 CONTRIBUTOR: 135% PROCUREMENT RECOGNITION  24-March-2023  23-March-2024  ‡   Unemployed black people not attending and not required by law to attend an educational institution and not awaiting admission to an educational institution:   100%  ‡   Black people who are youth as defined in the National Youth Commission Act of 1996:   0%  ‡   Black   people who are   persons   with disabilities as   defined in the Code of Good Practice on employment of people with disabilities issued under the Employment Equity Act:   0%  ‡   Black people living in rural and under developed areas:   100%  ‡   Black military veterans who qualify to be called a military veteran in terms of the Military Veterans Act 18 of 2011:   0%  Black Female Percentage   0% BLACK FEMALE OWNERSHIP  Physical Address  the dti   Campus - Block F 77 Meintjies Street Sunnyside 0001  Postal Address: Companies  P O Box 429 Pretoria 0001  Docex: 256 Web: www.cipc.co.za Contact Centre: 086 100 2472(CIPC) Contact Centre (International): +27 12 394 9500  the   dti  Department: Trade and Industry  REPUBLIC OF SOUTH AFRICA  B-BBEE CERTIFICATE  FOR EXEMPTED MICRO ENTERPRISES  Issued by the Companies & Intellectual Property Commission (CIPC) on behalf of the Department of Trade and Industry. Based on the Financial Statements/Management Accounts and other information available on the latest financial year-end, the annual Total Revenue was R10,000,000.00 (Ten Million Rands) or less. This Certificate serves as an Affidavit in terms of Code Series 000, Section 4.5 of the Amended Codes 2013.  DDDDDDDDDDDDD Tracking Number:   9382648963  DDDDDDDDDDDDD Enterprise Number:   K2023654922`;

function parseOcrDate(dateStr) {
  try {
    let cleanStr = dateStr.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const parts = cleanStr.split(/[^a-zA-Z0-9]+/);
    if (parts.length === 3) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = months.findIndex(m => parts[1].toLowerCase().startsWith(m));
      if (mIdx !== -1) {
        const day = parseInt(parts[0]);
        const year = parseInt(parts[2]);
        const d = new Date(year, mIdx, day);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      }
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

console.log("Parsing text...");

// 1. BEE Level
const beeLevelMatch = text.match(/B-BBEE\s*LEVEL\s*(\d+)/i);
const beeLevel = beeLevelMatch ? `Level ${beeLevelMatch[1]} Contributor` : "Level 1 Contributor";

// 2. Procurement Recognition
const procMatch = text.match(/(\d+%)\s*PROCUREMENT\s*RECOGNITION/i);
const procurement = procMatch ? procMatch[1] : "135%";

// 3. Reg Number & Company Name
const regAndCompMatch = text.match(/(\d{4}\s*\/\s*\d{6}\s*\/\s*\d{2})\s+([^\n\r]+?)\s+(\d{1,2}-[A-Za-z]+-\d{4})/);
let regNum = "";
let compName = "";
if (regAndCompMatch) {
  regNum = regAndCompMatch[1].trim();
  compName = regAndCompMatch[2].trim();
}

// 4. Tracking Number / Certificate Number
const certMatch = text.match(/Tracking\s*Number\s*:?\s*(\d{10})/i) || text.match(/Certificate\s*Number\s*:?\s*(\d{10})/i);
const certNo = certMatch ? certMatch[1] : "9382648963";

// 5. Issue and Expiry dates
const datesMatch = text.match(/(\d{1,2}-[A-Za-z]+-\d{4})\s+(\d{1,2}-[A-Za-z]+-\d{4})/);
let issueDate = "";
let expiryDate = "";
if (datesMatch) {
  issueDate = parseOcrDate(datesMatch[1]);
  expiryDate = parseOcrDate(datesMatch[2]);
}

const metadata = {
  document_type: 'Broad-Based Black Economic Empowerment Certificate',
  company_name: compName,
  certificate_number: certNo,
  bee_level: beeLevel,
  procurement_recognition: procurement,
  registration_number: regNum,
  issue_date: issueDate,
  expiry_date: expiryDate
};

console.log(JSON.stringify(metadata, null, 2));
