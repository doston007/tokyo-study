import { useState, useEffect } from "react";
import { Award, Users, ChevronDown, RefreshCw, Calendar, Download } from "lucide-react";
import { fetchGoogleSheetData, SalesEmployee, fetchBranchManagers } from "./api/googleSheets";
import { uzbekTranslations } from "./i18n";
import { exportToCSV, exportToJSON } from "./utils/exportData";
// Import logo - add your logo file to src/assets/logo.png
import logoImage from "./assets/logo.png";

interface TimeFrame {
  label: string;
  key: "today" | "week" | "month" | "sixMonths" | "year" | "custom";
}

const timeframes: TimeFrame[] = [
  { label: "Бугун", key: "today" },
  { label: "Ушбу Ҳафта", key: "week" },
  { label: "Ушбу Ой", key: "month" },
  { label: "Охирги 6 Ой", key: "sixMonths" },
  { label: "Ушбу Йил", key: "year" },
  { label: "Махсус Диапазон", key: "custom" },
];

function App() {
  const [salesData, setSalesData] = useState<SalesEmployee[]>([]);
  const [branchManagers, setBranchManagers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"today" | "week" | "month" | "sixMonths" | "year" | "custom">("month");
  const [selectedBranch, setSelectedBranch] = useState("Барча Филиаллар");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load both sales data and branch managers in parallel
      const [data, managers] = await Promise.all([
        fetchGoogleSheetData(),
        fetchBranchManagers()
      ]);
      setSalesData(data);
      setBranchManagers(managers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Маълумотлар юклаш мажбур бўлди");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique branches - combine from sales data and branch managers list
  const branchesFromSales = new Set(salesData.map((emp) => emp.branch));
  const branchesFromManagers = new Set(branchManagers.keys());
  const allBranches = new Set([...branchesFromSales, ...branchesFromManagers]);
  const branches = ["Барча Филиаллар", ...Array.from(allBranches).sort()];

  // Filter data by branch
  const filteredData = selectedBranch === "Барча Филиаллар" 
    ? salesData 
    : salesData.filter((emp) => emp.branch === selectedBranch);

  // Calculate custom date range sales
  const getCustomRangeSales = (employee: SalesEmployee): number => {
    if (!customDateStart || !customDateEnd) return 0;
    
    const startDate = new Date(customDateStart);
    const endDate = new Date(customDateEnd);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // For demo purposes, we'll use a simple calculation
    // In a real scenario, you'd need to fetch and filter by actual dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate <= today && endDate >= today) {
      return employee.today;
    }
    
    // If range is within a month, estimate from monthly average
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthlyAvg = employee.month / 30;
    return Math.round(monthlyAvg * daysDiff);
  };

  // Filter by timeframe - only show employees with sales in selected period
  const timeframeFilteredData = filteredData.filter((emp) => {
    const sales = selectedTimeframe === "custom" 
      ? getCustomRangeSales(emp)
      : emp[selectedTimeframe];
    return sales > 0;
  });

  // Sort by invoice first, then by 6mln
  const sortedData = [...timeframeFilteredData].sort((a, b) => {
    // Get breakdown for selected timeframe
    const getBreakdownForSort = (emp: SalesEmployee) => {
      if (selectedTimeframe === "custom") {
        return { invoice: emp.invoice, amount6mln: emp.amount6mln };
      }
      const breakdownKey = `${selectedTimeframe}Breakdown` as keyof typeof emp;
      const breakdown = emp[breakdownKey];
      if (breakdown && typeof breakdown === 'object' && 'invoice' in breakdown) {
        return breakdown as { amount6mln: number; invoice: number; invoice3000: number };
      }
      return { invoice: emp.invoice, amount6mln: emp.amount6mln };
    };
    
    const aBreakdown = getBreakdownForSort(a);
    const bBreakdown = getBreakdownForSort(b);
    
    // First sort by invoice (descending)
    if (bBreakdown.invoice !== aBreakdown.invoice) {
      return bBreakdown.invoice - aBreakdown.invoice;
    }
    
    // If invoice is equal, sort by 6mln (descending)
    return bBreakdown.amount6mln - aBreakdown.amount6mln;
  });

  // Calculate metrics
  const activeEmployees = sortedData.length;
  
  // Find top branch based on selected timeframe
  // Group employees by branch and calculate total sales per branch
  const branchSales = new Map<string, { total: number; employees: SalesEmployee[] }>();
  
  sortedData.forEach((emp) => {
    const sales = selectedTimeframe === "custom" 
      ? getCustomRangeSales(emp)
      : emp[selectedTimeframe];
    
    if (!branchSales.has(emp.branch)) {
      branchSales.set(emp.branch, { total: 0, employees: [] });
    }
    
    const branchData = branchSales.get(emp.branch)!;
    branchData.total += sales;
    branchData.employees.push(emp);
  });
  
  // Find top branch
  let topBranch: { branch: string; total: number; topEmployee: SalesEmployee } | null = null;
  
  branchSales.forEach((data, branch) => {
    if (data.employees.length === 0) return;
    
    if (!topBranch || data.total > topBranch.total) {
      // Find top employee in this branch
      const topEmployee = data.employees.reduce((top, current) => {
        const topSales = selectedTimeframe === "custom" 
          ? getCustomRangeSales(top)
          : top[selectedTimeframe];
        const currentSales = selectedTimeframe === "custom"
          ? getCustomRangeSales(current)
          : current[selectedTimeframe];
        return currentSales > topSales ? current : top;
      });
      
      topBranch = {
        branch,
        total: data.total,
        topEmployee
      };
    }
  });

  // Store topBranch info for rendering
  const topBranchInfo: { branch: string; managerName: string } | null = topBranch !== null ? {
    branch: (topBranch as { branch: string; total: number; topEmployee: SalesEmployee }).branch,
    managerName: branchManagers.get((topBranch as { branch: string; total: number; topEmployee: SalesEmployee }).branch) || "Маълумот йўқ"
  } : null;

  // Format currency (showing just the number without $ symbol)
  // Манба: Google Sheets CSV файлидан парс қилинган рақамлар
  // googleSheets.ts: parseSheetData() - saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("uz-UZ").format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Сотув маълумотлари юкланмоқда...</p>
          <p className="text-slate-400 mt-2">Google Sheets дан юкланмоқда</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <p className="text-white text-lg font-semibold mb-4">{uzbekTranslations.errorLoadingData}</p>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
          >
            {uzbekTranslations.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-5 mb-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <img 
                src={logoImage} 
                alt="StudyTokyo Logo" 
                className="h-12 w-auto relative rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              {uzbekTranslations.salesPerformance}
            </h1>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-lg text-slate-400 max-w-2xl">
              {uzbekTranslations.realtimeRankings}
            </p>
            <div className="flex items-center gap-3">
              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-all hover:text-white"
                  title={uzbekTranslations.exportReport}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">{uzbekTranslations.export}</span>
                </button>
                
                {/* Export Dropdown Menu */}
                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden min-w-40">
                    <button
                      onClick={() => {
                        exportToCSV(sortedData, String(selectedTimeframe), selectedBranch);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                    >
                      📊 {uzbekTranslations.exportAsCSV}
                    </button>
                    <button
                      onClick={() => {
                        exportToJSON(sortedData, String(selectedTimeframe), selectedBranch);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      { } {uzbekTranslations.exportAsJSON}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-all disabled:opacity-50"
                title="Google Sheets дан маълумотларни янгилаш"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">{uzbekTranslations.refresh}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Time Period Buttons */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">
              {uzbekTranslations.timePeriod}
            </label>
            <div className="flex flex-wrap gap-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => {
                    setSelectedTimeframe(tf.key as any);
                    if (tf.key === "custom") {
                      setShowDatePicker(true);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    selectedTimeframe === tf.key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50 scale-105"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Branch Filter */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">
              {uzbekTranslations.branchFilter}
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer font-semibold"
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch} className="bg-slate-800">
                    {branch}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Custom Date Range Picker */}
        {showDatePicker && selectedTimeframe === "custom" && (
          <div className="mb-10 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">{uzbekTranslations.selectCustomDateRange}</h3>
              </div>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
                  {uzbekTranslations.startDate}
                </label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
                  {uzbekTranslations.endDate}
                </label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold cursor-pointer"
                />
              </div>
            </div>
            {customDateStart && customDateEnd && (
              <div className="mt-6 p-4 bg-emerald-900/30 border border-emerald-500/40 rounded-lg">
                <p className="text-sm text-emerald-200">
                  📊 Сотув маълумотлари: <span className="font-semibold">{customDateStart}</span> дан <span className="font-semibold">{customDateEnd}</span> гача кўрсатилмоқда
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top Performers Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Top Employee Card */}
          {sortedData.length > 0 && (
            <div className="bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-slate-900/30 border-2 border-blue-500/40 rounded-2xl p-8 backdrop-blur-sm hover:border-blue-500/60 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  Энг кўп сотув қилган ходим
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">Исми:</p>
                  <p className="text-3xl font-bold text-white">{sortedData[0].name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">Филиал:</p>
                  <p className="text-2xl font-bold text-blue-400">{sortedData[0].branch}</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Branch Card */}
          {topBranchInfo && (
            <div className="bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-slate-900/30 border-2 border-emerald-500/40 rounded-2xl p-8 backdrop-blur-sm hover:border-emerald-500/60 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Энг кўп сотув қилган филиал
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">Филиал:</p>
                  <p className="text-3xl font-bold text-emerald-400">{topBranchInfo.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">РОП (Менеджер):</p>
                  <p className="text-2xl font-bold text-white">{topBranchInfo.managerName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="mb-10">
          {/* Active Employees Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.activeEmployees}</h3>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-cyan-500/40 transition-all">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-2">{activeEmployees}</p>
            <p className="text-sm text-slate-500">
              {selectedBranch === "Барча Филиаллар" ? uzbekTranslations.inAllBranches : uzbekTranslations.branch + ": " + selectedBranch}
            </p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-slate-700 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
            <h2 className="text-2xl font-bold text-white">{uzbekTranslations.employeeLeaderboard}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.rank}</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.name}</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.branch}</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">6млн</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Инвоис</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">$3000</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-8 text-center text-slate-400">
                      {uzbekTranslations.noData}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((employee, index) => {
                    const isTopPerformer = index === 0;
                    const isTopThree = index < 3;
                    
                    // Get breakdown for selected timeframe
                    const getBreakdown = () => {
                      if (selectedTimeframe === "custom") {
                        // For custom range, use all-time values (approximation)
                        return {
                          amount6mln: employee.amount6mln,
                          invoice: employee.invoice,
                          invoice3000: employee.invoice3000
                        };
                      }
                      
                      const breakdownKey = `${selectedTimeframe}Breakdown` as keyof typeof employee;
                      const breakdown = employee[breakdownKey];
                      
                      if (breakdown && typeof breakdown === 'object' && 'amount6mln' in breakdown) {
                        return breakdown as { amount6mln: number; invoice: number; invoice3000: number };
                      }
                      
                      // Fallback to all-time values
                      return {
                        amount6mln: employee.amount6mln,
                        invoice: employee.invoice,
                        invoice3000: employee.invoice3000
                      };
                    };
                    
                    const breakdown = getBreakdown();

                    return (
                      <tr
                        key={employee.id}
                        className={`border-b border-slate-700 transition-all duration-200 ${
                          isTopPerformer
                            ? "bg-emerald-900/20 hover:bg-emerald-900/30"
                            : isTopThree
                            ? "bg-slate-800/30 hover:bg-slate-800/50"
                            : "hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="px-8 py-5">
                          <span className="text-2xl font-bold">
                            {isTopPerformer ? "🥇" : isTopThree ? (index === 1 ? "🥈" : "🥉") : <span className="text-slate-500 text-lg font-semibold">{index + 1}</span>}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-white text-lg">{employee.name}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-slate-400">{employee.branch}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="font-semibold text-emerald-400 text-base">
                            {formatCurrency(breakdown.amount6mln)}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="font-semibold text-blue-400 text-base">
                            {formatCurrency(breakdown.invoice)}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="font-semibold text-purple-400 text-base">
                            {formatCurrency(breakdown.invoice3000)}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center">
          <p className="text-slate-500 text-sm">
            {uzbekTranslations.lastUpdated}: <span className="text-slate-300 font-semibold">{new Date().toLocaleString("uz-UZ")}</span>
          </p>
          <p className="text-slate-600 text-sm mt-2">
            {uzbekTranslations.dataSyncedFrom}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
