// Uzbek language translations for the Sales Dashboard
// Барча сатувларнинг манбаси: Google Sheets CSV из src/api/googleSheets.ts
// Рақамлар googleSheets.ts файлида қуйидаги жойларда агрегирланади:
// 1. parseSheetData() - Google Sheets CSV дан маълумотларни ўқиб, ўйнаганлаштира
// 2. safeParseInt() - рақамларни қўштириш үчин парс қилади
// 3. saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500
// 4. Вақт доираси (today, week, month, sixMonths, year) назорат қилинади parseSheetData() де

export const uzbekTranslations = {
  // Header & Navigation
  performanceHub: "ХОДИМ Фаолияти",
  salesPerformance: "Сотув Фаолияти",
  realtimeRankings: "Ходимларнинг рейтинги, қаршилашувчи тахлил ва фаолиятнинг метрикаси бир назарда",
  refresh: "Янгилаш",
  
  // Time Period Filters
  timePeriod: "Вақт Доирасі",
  today: "Бугун",
  thisWeek: "Ушбу Ҳафта",
  thisMonth: "Ушбу Ой",
  last6Months: "Охирги 6 Ой",
  thisYear: "Ушбу Йил",
  customRange: "Махсус Диапазон",
  
  // Branch Filter
  branchFilter: "Филиаллар",
  allBranches: "Барча Филиаллар",
  
  // Custom Date Range Picker
  selectCustomDateRange: "Махсус Вақт Доирасини Танланг",
  startDate: "Бошланиш Санаси",
  endDate: "Тугаш Санаси",
  
  // Top Performer Section
  topPerformer: "Энг Яхши Ходим",
  name: "Исми",
  branch: "Филиал",
  sales: "Сотув",
  
  // KPI Cards
  totalSales: "Жами Сотув",
  activeEmployees: "Ходимлар",
  avgSalesPerEmployee: "Ўртача сотув",
  inAllBranches: "Барча филиаллар бўйича",
  perEmployeeInPeriod: "Kиши бошига сотув сони",
  
  // Leaderboard
  employeeLeaderboard: "Ходимлар Рейтинги",
  rank: "Ўрин",
  status: "Ҳолати",
  top: "Энг Яхши",
  top3: "3та Энг Яхши",
  active: "Фаол",
  inactive: "Нофаол",
  
  // Footer
  lastUpdated: "Охирги янгилаш",
  dataSyncedFrom: "Google Sheet дан автоматик синхронизирланган маълумотлар. Охирги янгиланиш учун Янгилаш тугмасини босинг.",
  
  // Status Values
  statusActive: "фаол",
  statusInactive: "нофаол",
  
  // Export Functionality
  export: "Экспорт",
  exportAsCSV: "CSV форматида юклаш",
  exportAsJSON: "JSON форматида юклаш",
  exportReport: "Отчётни юклаш",
  
  // Error Messages
  errorLoadingData: "Маълумотлар Юклаш Хатоси",
  unableFetchSheets: "Google Sheets маълумотларини юкла олмадим. Юклаш мажбур қилди",
  noteSheetPublic: "Эслатма: Сизнинг Google Sheet ишчи қаташи публик бўлиши керак ёки CORS чегаралашларини бўлиб ўтиш учун Youware Backend интеграциясини ўрнатишиңиз керак.",
  tryAgain: "Қайтадан Уриниш",
  noData: "Танланган сўзгичлар uchun маълумотлар йўқ",
  
  // Number formatting (removed $ symbol as requested)
  // Рақамлар Google Sheets дан қўйидаги устунлардан ўқиляди:
  // - "Shartnoma soni" (Шартномалар сони)
  // - "Yuqori bonusli $3000" (3000 хақидан)
  // - "Bugungi $1400" (1400 хақидан)
  // - "Bugungi $900" (900 хақидан)
  // - "Bugungi $500" (500 хақидан)
  // - "6 MLN to'lovlar" (6 миллион то'lovlar)
  // Барча рақамлар қўўштирилади: saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500
  
  formatNumber: (value: number): string => {
    return new Intl.NumberFormat("uz-UZ").format(value);
  }
} as const;

export type TranslationKey = keyof typeof uzbekTranslations;

export function t(key: TranslationKey, params?: Record<string, any>): string {
  const value = uzbekTranslations[key];
  if (typeof value === "function") {
    return value(params?.value);
  }
  return value as string;
}
