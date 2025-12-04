import React, { useState, useEffect } from "react";
import { TrendingUp, Award, Users, DollarSign, ChevronDown, RefreshCw, Calendar, Download } from "lucide-react";
import { fetchGoogleSheetData, SalesEmployee } from "./api/googleSheets";
import { uzbekTranslations } from "./i18n";
import { exportToCSV, exportToJSON } from "./utils/exportData";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"today" | "week" | "month" | "sixMonths" | "year" | "custom">("month");
  const [selectedBranch, setSelectedBranch] = useState("Барча Филиаллар");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"фаол" | "нофаол" | "барча">("барча");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleSheetData();
      setSalesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Маълумотлар юклаш мажбур бўлди");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique branches
  const branches = ["Барча Филиаллар", ...Array.from(new Set(salesData.map((emp) => emp.branch)))];

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

  // Sort by selected timeframe
  const sortedData = [...filteredData].sort((a, b) => {
    if (selectedTimeframe === "custom") {
      return getCustomRangeSales(b) - getCustomRangeSales(a);
    }
    return b[selectedTimeframe] - a[selectedTimeframe];
  });

  // Calculate metrics
  // МАНБА: Барча рақамлар googleSheets.ts файлидан ўқилади
  // parseSheetData() функцияси Google Sheets CSV дан маълумотларни парс қилади
  // Рақамлар қўйидаги Google Sheets устунларидан ўқилади:
  // - "Shartnoma soni" (Шартномалар сони)
  // - "Yuqori bonusli $3000" (3000 сўм)
  // - "Bugungi $1400" (1400 сўм)
  // - "Bugungi $900" (900 сўм)
  // - "Bugungi $500" (500 сўм)
  // - "6 MLN to'lovlar" (6 миллион сўм)
  // saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500
  let totalSales = 0;
  if (selectedTimeframe === "custom") {
    totalSales = sortedData.reduce((sum, emp) => sum + getCustomRangeSales(emp), 0);
  } else {
    totalSales = sortedData.reduce((sum, emp) => sum + emp[selectedTimeframe], 0);
  }
  const activeEmployees = sortedData.length;
  const averageSalesPerEmployee = activeEmployees > 0 ? Math.round(totalSales / activeEmployees) : 0;
  const topPerformer = sortedData[0];

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
          <p className="text-white text-lg font-semibold">Сотув маълумотлари юклаў...</p>
          <p className="text-slate-400 mt-2">Google Sheets дан юклаў</p>
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
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full">
            <p className="text-xs font-bold text-white uppercase tracking-widest">{uzbekTranslations.performanceHub}</p>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight">
            {uzbekTranslations.salesPerformance}
          </h1>
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
        <div className="grid md:grid-cols-3 gap-6 mb-10">
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

          {/* Status Filter Button */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">
              {uzbekTranslations.status}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("фаол")}
                className={`flex-1 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  statusFilter === "фаол"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600"
                }`}
              >
                Фаол
              </button>
              <button
                onClick={() => setStatusFilter("нофаол")}
                className={`flex-1 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  statusFilter === "нофаол"
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/50"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600"
                }`}
              >
                Нофаол
              </button>
              <button
                onClick={() => setStatusFilter("барча")}
                className={`flex-1 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  statusFilter === "барча"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600"
                }`}
              >
                Барча
              </button>
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

        {/* Top Performer Section */}
        {topPerformer && (
          <div className="mb-10 bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-slate-900/30 border-2 border-emerald-500/40 rounded-2xl p-8 lg:p-10 backdrop-blur-sm hover:border-emerald-500/60 transition-all duration-300">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {uzbekTranslations.topPerformer}
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">{uzbekTranslations.name}</p>
                <p className="text-4xl font-bold text-white">{topPerformer.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">{uzbekTranslations.branch}</p>
                <p className="text-3xl font-bold text-emerald-400">{topPerformer.branch}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">
                  {uzbekTranslations.sales} ({timeframes.find(t => t.key === selectedTimeframe)?.label})
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  {selectedTimeframe === "custom" 
                    ? formatCurrency(getCustomRangeSales(topPerformer))
                    : formatCurrency(topPerformer[selectedTimeframe])}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Total Sales Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.totalSales}</h3>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:from-emerald-500/40 group-hover:to-teal-500/40 transition-all">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-2">{formatCurrency(totalSales)}</p>
            <p className="text-sm text-slate-500">
              {selectedTimeframe === "custom" && customDateStart && customDateEnd
                ? `${customDateStart} дан ${customDateEnd} гача`
                : timeframes.find(t => t.key === selectedTimeframe)?.label}
            </p>
          </div>

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

          {/* Average Sales Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.avgSalesPerEmployee}</h3>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-violet-500/40 group-hover:to-purple-500/40 transition-all">
                <TrendingUp className="w-6 h-6 text-violet-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-2">{formatCurrency(averageSalesPerEmployee)}</p>
            <p className="text-sm text-slate-500">
              {uzbekTranslations.perEmployeeInPeriod}
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
                  <th className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {uzbekTranslations.sales} ({timeframes.find(t => t.key === selectedTimeframe)?.label})
                  </th>
                  <th className="px-8 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{uzbekTranslations.status}</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-8 text-center text-slate-400">
                      {uzbekTranslations.noData}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((employee, index) => {
                    const isTopPerformer = index === 0;
                    const isTopThree = index < 3;

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
                          <p className="font-bold text-white text-lg">
                            {selectedTimeframe === "custom" 
                              ? formatCurrency(getCustomRangeSales(employee))
                              : formatCurrency(employee[selectedTimeframe])}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span
                            className={`inline-block px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isTopPerformer
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                                : isTopThree
                                ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                                : "bg-slate-700/50 text-slate-300"
                            }`}
                          >
                            {isTopPerformer ? "🏆 " + uzbekTranslations.top : isTopThree ? "⭐ " + uzbekTranslations.top3 : uzbekTranslations.active}
                          </span>
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
