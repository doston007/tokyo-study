/**
 * Google Sheets integration service
 * Fetches and parses sales data from Google Sheets
 * Uses Youware Backend as a proxy to bypass CORS restrictions
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
}

const SHEET_ID = "1E_yqnR4cXBMwwdzDd34ImsC7G4npHgAFWBAwMBQRsho";
const SHEET_GID = "1714172454";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// Cache the data
let cachedData: SalesEmployee[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch data from Google Sheets CSV export
 * Attempts direct fetch first, then uses backend proxy
 */
export async function fetchGoogleSheetData(): Promise<SalesEmployee[]> {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // Try to use Youware Backend as a proxy
    // The backend can make cross-origin requests without CORS issues
    const backendUrl = `/api/proxy/sheets?id=${SHEET_ID}&gid=${SHEET_GID}`;
    
    try {
      const response = await fetch(backendUrl);
      if (response.ok) {
        const csvText = await response.text();
        const data = parseSheetData(csvText);
        cachedData = data;
        lastFetchTime = now;
        return data;
      }
    } catch (backendError) {
      console.warn("Backend proxy not available, attempting direct fetch", backendError);
    }

    // Fallback: Try direct fetch without custom headers
    const response = await fetch(SHEET_URL);
    if (response.ok) {
      const csvText = await response.text();
      const data = parseSheetData(csvText);
      cachedData = data;
      lastFetchTime = now;
      return data;
    }

    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    
    // If all fails, throw error with helpful message
    if (error instanceof Error) {
      throw new Error(
        `Unable to fetch Google Sheets data. ${error.message}\n\n` +
        `Note: Your Google Sheet may need to be publicly accessible or you may need to ` +
        `enable the Youware Backend integration to bypass CORS restrictions.`
      );
    }
    throw error;
  }
}

/**
 * Parse CSV data and aggregate by employee name and branch
 */
function parseSheetData(csvText: string): SalesEmployee[] {
  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("Sheet data is empty or invalid");
  }

  // Parse headers (Uzbek language headers)
  const headers = lines[0].split(",").map((h) => h.trim());

  // Find relevant column indices - look for Uzbek column headers
  const nameIdx = findColumnIndex(headers, [
    "Hisobot kirituvchi",
    "FISh",
    "mas'ul shaxs",
    "Name",
    "person"
  ]);
  
  const branchIdx = findColumnIndex(headers, [
    "Filialingizni",
    "Filial",
    "Branch",
    "branch"
  ]);
  
  const dateIdx = findColumnIndex(headers, [
    "Bugungi kunni",
    "Timestamp",
    "Date",
    "date",
    "Data"
  ]);
  
  const contractIdx = findColumnIndex(headers, [
    "Shartnoma",
    "contract",
    "Contract"
  ]);
  
  const invoice3000Idx = findColumnIndex(headers, [
    "$3000",
    "3000",
    "invoice 3000"
  ]);
  
  const invoice1400Idx = findColumnIndex(headers, [
    "$1400",
    "1400",
    "invoice 1400"
  ]);
  
  const invoice900Idx = findColumnIndex(headers, [
    "$900",
    "900",
    "invoice 900"
  ]);
  
  const invoice500Idx = findColumnIndex(headers, [
    "$500",
    "500",
    "invoice 500"
  ]);
  
  const payment6mlnIdx = findColumnIndex(headers, [
    "6 MLN",
    "6mln",
    "payment"
  ]);

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

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line
    const fields = parseCSVLine(line);

    if (fields.length < Math.max(nameIdx, branchIdx, dateIdx) + 1) {
      continue;
    }

    const name = fields[nameIdx]?.trim() || "Unknown";
    const branch = fields[branchIdx]?.trim() || "Unknown";
    const dateStr = fields[dateIdx]?.trim() || "";

    // Skip invalid entries
    if (!name || name === "0" || name.length < 2) continue;

    // Parse amounts - handle empty or invalid values
    const contracts = safeParseInt(fields[contractIdx]);
    const invoice3000 = safeParseInt(fields[invoice3000Idx]);
    const invoice1400 = safeParseInt(fields[invoice1400Idx]);
    const invoice900 = safeParseInt(fields[invoice900Idx]);
    const invoice500 = safeParseInt(fields[invoice500Idx]);
    const payment6mln = safeParseInt(fields[payment6mlnIdx]);

    // Calculate sale amount
    const saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500;

    // Skip if no sales
    if (saleAmount <= 0) continue;

    // Parse date
    const parsedDate = parseDate(dateStr);
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
  }

  const result = Array.from(employeeMap.values());
  if (result.length === 0) {
    throw new Error("No valid employee data found in sheet");
  }

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
 * Safe integer parsing
 */
function safeParseInt(value?: string): number {
  if (!value) return 0;
  const parsed = parseInt(value, 10);
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
