/**
 * Google Sheets integration service
 * Fetches and parses sales data from Google Sheets
 */

export interface RawSheetRow {
  [key: string]: string | number;
}

export interface SalesEmployee {
  id: string;
  name: string;
  branch: string;
  today: number;
  week: number;
  month: number;
  sixMonths: number;
  year: number;
  amount6mln: number; // Sharnoma turi (6млн)
  invoice: number; // Invoice $ (Инвоис)
  invoice3000: number; // $3000 (Инвоис 3000)
}

// Single Google Sheet source
const SHEET_ID = "10opxikq7eMlBTvlByRe2nwgGqYf-Xj6HYjg7cUdBQM4";
const SHEET_GID = "2019879851";

// Cache the data
let cachedData: SalesEmployee[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch data from single Google Sheets CSV export
 * Regions are extracted from the "Filial" column
 */
export async function fetchGoogleSheetData(): Promise<SalesEmployee[]> {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  let csvText: string | null = null;
  let fetchError: string | null = null;

  // Try to fetch from the single sheet
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    console.log(`Attempting to fetch data from ${sheetUrl}`);
    
    try {
      const response = await fetch(sheetUrl);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        csvText = await response.text();
        console.log(`Success, received ${csvText.length} characters`);
      } else {
        // Try alternative URL format with /pub
        try {
          const altUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?output=csv&gid=${SHEET_GID}`;
          console.log(`Trying alternative URL format: ${altUrl}`);
          const altResponse = await fetch(altUrl);
          if (altResponse.ok) {
            csvText = await altResponse.text();
            console.log(`Alternative URL success, received ${csvText.length} characters`);
          } else {
            fetchError = `Both direct fetch (${response.status}) and alternative URL (${altResponse.status}) failed`;
            console.warn(`All fetch methods failed: ${fetchError}`);
          }
        } catch (altErr) {
          fetchError = `Direct fetch returned ${response.status}`;
          console.warn(`Direct fetch failed: ${fetchError}`);
        }
      }
    } catch (fetchErr) {
      fetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`Fetch error:`, fetchError);
    }

    if (csvText && csvText.trim().length > 0) {
      console.log(`Parsing data...`);
      const allEmployees = parseSheetData(csvText);
      console.log(`Parsed ${allEmployees.length} employees`);
      
      cachedData = allEmployees;
      lastFetchTime = now;
      return allEmployees;
    } else {
      throw new Error(
        `No CSV data received. ${fetchError || 'Unknown error'}\n\n` +
        `Please ensure:\n` +
        `1. Google Sheet is set to "Anyone with the link can view"\n` +
        `2. Check browser console for detailed error messages\n` +
        `3. Verify sheet ID and GID are correct in the code`
      );
    }
  } catch (error) {
    const errorMsg = `Error fetching data: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg, error);
    throw new Error(errorMsg);
  }
}

/**
 * Parse CSV data and aggregate by employee name and branch
 * Regions are extracted from the "Filial" column
 */
function parseSheetData(csvText: string): SalesEmployee[] {
  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    console.warn(`Not enough lines in CSV: ${lines.length} (need at least 2: headers, data)`);
    return [];
  }

  // Parse headers from first line (index 0)
  const headers = lines[0].split(",").map((h) => h.trim());
  console.log(`Headers (from line 1):`, headers.slice(0, 15)); // Log first 15 headers

  // Find relevant column indices
  // Column C: Filial (Branch/Region)
  const filialIdx = findColumnIndex(headers, [
    "Filial",
    "filial",
    "Филиал",
    "Branch",
    "branch"
  ]);
  
  // Column B: To'lov sanasi (Payment date) - приоритет на "To'lov sanasi"
  const dateIdx = findColumnIndex(headers, [
    "To'lov sanasi",
    "To'lov sanasi",
    "Payment date",
    "date",
    "Date"
  ]);
  
  // Column D: 6 mln (приоритет на "6 mln")
  const amount6mlnIdx = findColumnIndex(headers, [
    "6 mln",
    "6mln",
    "6млн"
  ]);
  
  // Column E: Invoice
  const invoiceIdx = findColumnIndex(headers, [
    "Invoice",
    "invoice",
    "Invoice $",
    "Инвоис"
  ]);
  
  // Column with $3000
  const invoice3000Idx = findColumnIndex(headers, [
    "$3000",
    "3000",
    "3000$",
    "Yuqori bonusli $3000"
  ]);

  // Find employee name columns (F-K: Xodim F. I. Sh for different regions)
  // We'll need to find which column has the employee name based on the Filial value
  const employeeNameIndices: { [key: string]: number } = {};
  const regionColumnMap: { [key: string]: string } = {
    "Toshkent": "Xodim F. I. Sh Toshkent",
    "Samarqand": "Xodim F. I. Sh Samarqand",
    "Andijon": "Xodim F. I. Sh Andijon",
    "Namangan": "Xodim F. I. Sh Namangan",
    "Farg'ona": "Xodim F. I. Sh Farg'ona",
    "Qarshi": "Xodim F. I. Sh Qarshi"
  };

  // Find all employee name columns
  for (const [region, columnName] of Object.entries(regionColumnMap)) {
    const idx = findColumnIndex(headers, [columnName, columnName.toLowerCase()]);
    if (idx !== -1) {
      employeeNameIndices[region] = idx;
    }
  }

  // Also try generic employee name columns
  const genericNameIdx = findColumnIndex(headers, [
    "Menejerining ismi",
    "Manager name",
    "Ism /familiya",
    "Ism / familiya",
    "Ism/familiya",
    "Name",
    "FISh",
    "Xodim"
  ]);

  console.log(`Column indices: filialIdx=${filialIdx}, dateIdx=${dateIdx}, amount6mlnIdx=${amount6mlnIdx}, invoiceIdx=${invoiceIdx}, invoice3000Idx=${invoice3000Idx}`);
  console.log(`Employee name column indices:`, employeeNameIndices);
  console.log(`Generic name index:`, genericNameIdx);
  console.log(`All headers:`, headers);

  if (filialIdx === -1) {
    console.error(`Could not find Filial column. Available headers:`, headers);
  }
  
  if (dateIdx === -1) {
    console.warn(`Could not find "To'lov sanasi" column. Available headers:`, headers);
    console.warn(`Trying to find similar date columns...`);
    headers.forEach((h, idx) => {
      if (h.toLowerCase().includes("sanasi") || h.toLowerCase().includes("date") || h.toLowerCase().includes("sana")) {
        console.warn(`Found similar date column at index ${idx}: "${h}"`);
      }
    });
  }
  
  if (amount6mlnIdx === -1) {
    console.warn(`Could not find "6 mln" column. Available headers:`, headers);
    console.warn(`Trying to find similar columns...`);
    // Попробуем найти похожие колонки
    headers.forEach((h, idx) => {
      if (h.toLowerCase().includes("6") || h.toLowerCase().includes("mln") || h.toLowerCase().includes("млн")) {
        console.warn(`Found similar column at index ${idx}: "${h}"`);
      }
    });
  }

  // Map to aggregate employee data
  const employeeMap = new Map<string, SalesEmployee>();

  // Get date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAgoStr = monthAgo.toISOString().split("T")[0];
  
  const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];
  
  const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
  const yearAgoStr = yearAgo.toISOString().split("T")[0];

  // Parse data rows (skip header row, start from line 1)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Skip TOTAL rows
    if (line.toUpperCase().includes("TOTAL")) continue;

    // Parse CSV line
    const fields = parseCSVLine(line);

    // Get Filial (branch/region) from column C
    const branch = filialIdx !== -1 ? fields[filialIdx]?.trim() || "" : "";
    if (!branch) continue;

    // Get employee name - try region-specific column first, then generic
    let name = "";
    if (employeeNameIndices[branch] !== undefined) {
      name = fields[employeeNameIndices[branch]]?.trim() || "";
    }
    if (!name && genericNameIdx !== -1) {
      name = fields[genericNameIdx]?.trim() || "";
    }
    
    // If still no name, try to find any non-empty employee name column
    if (!name) {
      for (const idx of Object.values(employeeNameIndices)) {
        const potentialName = fields[idx]?.trim() || "";
        if (potentialName && potentialName !== "0" && potentialName.length > 2) {
          name = potentialName;
          break;
        }
      }
    }

    // Skip invalid entries
    if (!name || name === "0" || name.length < 2 || name.toLowerCase() === "total") continue;

    // Get date from column B (To'lov sanasi)
    const dateStr = dateIdx !== -1 ? fields[dateIdx]?.trim() || "" : "";
    
    // Debug logging for first few rows
    if (i <= 3 && dateIdx !== -1) {
      console.log(`Row ${i}: dateStr="${dateStr}", column index=${dateIdx}, parsed date:`, dateStr ? parseDate(dateStr) : "null");
    }

    // Parse amounts
    // Column D: 6 mln - это количество контрактов (например, 1), а не сумма
    const amount6mlnStr = amount6mlnIdx !== -1 ? fields[amount6mlnIdx]?.trim() || "0" : "0";
    const amount6mln = safeParseInt(amount6mlnStr); // Количество контрактов на 6 млн
    
    // Debug logging for first few rows
    if (i <= 3 && amount6mlnIdx !== -1) {
      console.log(`Row ${i}: amount6mlnStr="${amount6mlnStr}", parsed=${amount6mln}, column index=${amount6mlnIdx}`);
    }
    
    // Column E: Invoice
    const invoiceStr = invoiceIdx !== -1 ? fields[invoiceIdx]?.trim() || "0" : "0";
    const invoice = safeParseInt(invoiceStr);
    
    // Column with $3000
    const invoice3000Str = invoice3000Idx !== -1 ? fields[invoice3000Idx]?.trim() || "0" : "0";
    const invoice3000 = safeParseInt(invoice3000Str);

    // Calculate sale amount
    // Для расчета суммы продаж: если есть контракт на 6 млн, считаем как 6000000, плюс invoice
    const amount6mlnValue = amount6mln > 0 ? 6000000 * amount6mln : 0;
    const saleAmount = amount6mlnValue + invoice;

    // Skip if no sales
    if (saleAmount <= 0) continue;

    // Parse date
    const parsedDate = dateStr ? parseDate(dateStr) : null;
    if (!parsedDate) continue;

    const key = `${name.toLowerCase()}|${branch}`;

    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        id: `${name}-${branch}`.replace(/\s+/g, "-").toLowerCase(),
        name,
        branch,
        today: 0,
        week: 0,
        month: 0,
        sixMonths: 0,
        year: 0,
        amount6mln: 0,
        invoice: 0,
        invoice3000: 0,
      });
    }

    const employee = employeeMap.get(key)!;
    const dateForComparison = parsedDate.toISOString().split("T")[0];

    // Aggregate based on date ranges
    if (dateForComparison === todayStr) {
      employee.today += saleAmount;
    }
    if (dateForComparison >= weekAgoStr) {
      employee.week += saleAmount;
    }
    if (dateForComparison >= monthAgoStr) {
      employee.month += saleAmount;
    }
    if (dateForComparison >= sixMonthsAgoStr) {
      employee.sixMonths += saleAmount;
    }
    if (dateForComparison >= yearAgoStr) {
      employee.year += saleAmount;
    }

    // Also aggregate the new fields
    employee.amount6mln += amount6mln;
    employee.invoice += invoice;
    employee.invoice3000 += invoice3000;
  }

  const result = Array.from(employeeMap.values());
  console.log(`Parsed ${result.length} employees from all regions`);
  return result;
}

/**
 * Find column index by searching for multiple possible headers
 */
function findColumnIndex(headers: string[], searchTerms: string[]): number {
  for (const term of searchTerms) {
    const idx = headers.findIndex((h) => h.toLowerCase().includes(term.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Safe integer parsing - handles numbers with spaces and other separators
 */
function safeParseInt(value?: string): number {
  if (!value) return 0;
  // Remove all spaces and non-digit characters except minus sign
  const cleaned = value.toString().replace(/\s+/g, "").replace(/[^\d-]/g, "");
  if (!cleaned) return 0;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());
  return fields;
}

/**
 * Parse date string (handles multiple formats)
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try parsing as ISO date
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateStr);
  }

  // Try parsing as DD.MM.YYYY (common format in Uzbek sheets)
  const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }

  // Try parsing as MM/DD/YYYY or DD/MM/YYYY
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, part1, part2, year] = match;
    const p1 = parseInt(part1, 10);
    const p2 = parseInt(part2, 10);

    // If first part > 12, it must be day (DD/MM/YYYY)
    if (p1 > 12) {
      return new Date(`${year}-${part2.padStart(2, "0")}-${part1.padStart(2, "0")}`);
    }
    // Otherwise assume MM/DD/YYYY
    return new Date(`${year}-${part1.padStart(2, "0")}-${part2.padStart(2, "0")}`);
  }

  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}
