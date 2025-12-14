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
}

// Region to Google Sheet mapping
interface RegionSheet {
  id: string;
  gid: string;
  name: string;
}

const REGION_SHEETS: RegionSheet[] = [
  { id: "15nrHKcxhYVThPxWJA7voKiy19DLphha-J6pOTj3pjm0", gid: "0", name: "Andijon" },
  { id: "1xnmpOF6SiPFvvFIT5tzQ1NmbJ_qIdqtqpPjYLfu8UQ0", gid: "0", name: "Samarqand" },
  { id: "1Qb1n2EJVMBVp2oY5pTCB46sUz73CnilFJCRElMlekow", gid: "0", name: "Namangan" },
  { id: "1lh58pWmpqk3V85yeOSLCSwbr6KNoGu1rSkjuER97UTA", gid: "0", name: "Farg'ona" },
  { id: "1w9KGElIf5lMnH3SuyjTZMEzxAgcxhVcZziNiHygfkWI", gid: "0", name: "Qarshi" },
];

// Cache the data
let cachedData: SalesEmployee[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch data from Google Sheets CSV export for all regions
 * Attempts direct fetch first, then uses backend proxy
 */
export async function fetchGoogleSheetData(): Promise<SalesEmployee[]> {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  const allEmployees: SalesEmployee[] = [];
  const errors: string[] = [];

  // Fetch data from all region sheets
  for (const regionSheet of REGION_SHEETS) {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${regionSheet.id}/export?format=csv&gid=${regionSheet.gid}`;
      console.log(`Attempting to fetch data for ${regionSheet.name} from ${sheetUrl}`);
      
      let csvText: string | null = null;
      let fetchError: string | null = null;
      
      try {
        console.log(`Fetching data for ${regionSheet.name}`);
        const response = await fetch(sheetUrl);
        console.log(`Response status for ${regionSheet.name}: ${response.status}`);
        
        if (response.ok) {
          csvText = await response.text();
          console.log(`Success for ${regionSheet.name}, received ${csvText.length} characters`);
        } else {
          // Try alternative URL format with /pub
          try {
            const altUrl = `https://docs.google.com/spreadsheets/d/${regionSheet.id}/pub?output=csv`;
            console.log(`Trying alternative URL format for ${regionSheet.name}: ${altUrl}`);
            const altResponse = await fetch(altUrl);
            if (altResponse.ok) {
              csvText = await altResponse.text();
              console.log(`Alternative URL success for ${regionSheet.name}, received ${csvText.length} characters`);
            } else {
              const errorText = await response.text().catch(() => response.statusText);
              fetchError = `Both direct fetch (${response.status}) and alternative URL (${altResponse.status}) failed`;
              console.warn(`All fetch methods failed for ${regionSheet.name}: ${fetchError}`);
            }
          } catch (altErr) {
            const errorText = await response.text().catch(() => response.statusText);
            fetchError = `Direct fetch returned ${response.status}: ${errorText}`;
            console.warn(`Direct fetch failed for ${regionSheet.name}: ${fetchError}`);
          }
        }
      } catch (fetchErr) {
        fetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error(`Fetch error for ${regionSheet.name}:`, fetchError);
      }

      if (csvText && csvText.trim().length > 0) {
        console.log(`Parsing data for ${regionSheet.name}...`);
        const regionData = parseSheetData(csvText, regionSheet.name);
        console.log(`Parsed ${regionData.length} employees from ${regionSheet.name}`);
        allEmployees.push(...regionData);
      } else {
        const errorMsg = `No CSV data received for ${regionSheet.name}. ${fetchError || 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Error fetching data for ${regionSheet.name}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(errorMsg, error);
      // Continue with other regions even if one fails
    }
  }

  if (allEmployees.length === 0) {
    const errorDetails = errors.length > 0 ? `\n\nErrors:\n${errors.join('\n')}` : '';
    throw new Error(
      `No data could be fetched from any region sheets.${errorDetails}\n\n` +
      `Please ensure:\n` +
      `1. All Google Sheets are set to "Anyone with the link can view"\n` +
      `2. Check browser console for detailed error messages\n` +
      `3. Verify sheet IDs are correct in the code`
    );
  }

  cachedData = allEmployees;
  lastFetchTime = now;
  return allEmployees;
}

/**
 * Parse CSV data and aggregate by employee name and branch
 */
function parseSheetData(csvText: string, regionName: string): SalesEmployee[] {
  const lines = csvText.trim().split("\n");

  if (lines.length < 3) {
    console.warn(`Not enough lines in CSV for ${regionName}: ${lines.length} (need at least 3: empty line, headers, data)`);
    return []; // Return empty array instead of throwing error
  }

  // Parse headers from second line (index 1)
  const headers = lines[1].split(",").map((h) => h.trim());
  console.log(`Headers for ${regionName} (from line 2):`, headers.slice(0, 10)); // Log first 10 headers

  // Find relevant column indices - new structure
  const nameIdx = findColumnIndex(headers, [
    "Menejerining ismi",
    "Menejerining ismi",
    "Manager name",
    "Ism /familiya",
    "Ism / familiya",
    "Ism/familiya",
    "Name",
    "FISh"
  ]);
  
  // Branch is determined by region name
  const branch = regionName;
  
  const dateIdx = findColumnIndex(headers, [
    "Shartnoma sanasi",
    "Shartnoma sanasi",
    "Date",
    "date",
    "Timestamp",
    "Bugungi kunni"
  ]);
  
  // New columns: Sharnoma turi (6млн) and Invoice $ (Инвоис)
  const sharnomaTuriIdx = findColumnIndex(headers, [
    "Sharnoma turi",
    "Shartnoma turi",
    "Sharnoma turi",
    "Contract type",
    "Shartnoma turi",
    "Shartnoma"
  ]);
  
  const invoiceIdx = findColumnIndex(headers, [
    "Invoice $",
    "Invoice",
    "invoice",
    "Invoice $"
  ]);

  console.log(`Column indices for ${regionName}: nameIdx=${nameIdx}, dateIdx=${dateIdx}, sharnomaTuriIdx=${sharnomaTuriIdx}, invoiceIdx=${invoiceIdx}`);

  if (nameIdx === -1) {
    console.error(`Could not find name column in ${regionName}. Available headers:`, headers);
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

  // Parse data rows (skip first empty line and header row, start from line 3)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Skip TOTAL rows
    if (line.toUpperCase().includes("TOTAL")) continue;

    // Parse CSV line
    const fields = parseCSVLine(line);

    // Check if we have minimum required fields
    if (nameIdx === -1 || fields.length < Math.max(nameIdx, dateIdx) + 1) {
      continue;
    }

    const name = fields[nameIdx]?.trim() || "";
    const dateStr = fields[dateIdx]?.trim() || "";

    // Skip invalid entries
    if (!name || name === "0" || name.length < 2 || name.toLowerCase() === "total") continue;

    // Parse amounts - new structure
    // Sharnoma turi (6млн) - convert to 1 if >= 6000000, else 0
    const sharnomaTuriStr = fields[sharnomaTuriIdx]?.trim() || "0";
    const sharnomaTuriValue = safeParseInt(sharnomaTuriStr);
    const amount6mln = sharnomaTuriValue >= 6000000 ? 1 : 0;
    
    // Invoice $ (Инвоис)
    const invoiceStr = fields[invoiceIdx]?.trim() || "0";
    const invoice = safeParseInt(invoiceStr);

    // Calculate sale amount (sum of both columns)
    // For 6млн, we use the original value for sale amount calculation, but count only >= 6000000
    const saleAmount = sharnomaTuriValue + invoice;

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
        amount6mln: 0,
        invoice: 0,
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
    // amount6mln is already 0 or 1 based on >= 6000000 threshold
    employee.amount6mln += amount6mln;
    employee.invoice += invoice;
  }

  const result = Array.from(employeeMap.values());
  console.log(`Parsed ${result.length} employees from ${regionName}`);
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
