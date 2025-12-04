import { SalesEmployee } from "../api/googleSheets";

/**
 * Экспорт функцияси - Ходимлар маълумотларини CSV ёки JSON форматда юклаш
 */

// CSV форматида маълумотлар юклаш
export const exportToCSV = (data: SalesEmployee[], selectedTimeframe: string, selectedBranch: string) => {
  // CSV заголовклари
  const headers = [
    "Ўрин",
    "Ходимнинг исми",
    "Филиал",
    `Сотув (${selectedTimeframe})`,
    "Статус"
  ];

  // CSV жойидан маълумотларни ўқиш
  const rows = data.map((employee, index) => [
    index + 1,
    employee.name,
    employee.branch,
    getEmployeeSales(employee, selectedTimeframe),
    getEmployeeStatus(index)
  ]);

  // CSV форматини яратиш
  const csv = [
    `Сотув Фаолияти Отчёти\nВақт: ${new Date().toLocaleString("uz-UZ")}\nФилиал: ${selectedBranch}\n`,
    headers.map(header => `"${header}"`).join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  // Файлни юклаш
  downloadFile(csv, `sales-report-${new Date().getTime()}.csv`, "text/csv");
};

// JSON форматида маълумотлар юклаш
export const exportToJSON = (data: SalesEmployee[], selectedTimeframe: string, selectedBranch: string) => {
  const jsonData = {
    title: "Сотув Фаолияти Отчёти",
    timestamp: new Date().toLocaleString("uz-UZ"),
    branch: selectedBranch,
    timeframe: selectedTimeframe,
    totalEmployees: data.length,
    employees: data.map((employee, index) => ({
      rank: index + 1,
      name: employee.name,
      branch: employee.branch,
      sales: getEmployeeSales(employee, selectedTimeframe),
      status: getEmployeeStatus(index),
      allTimeData: {
        today: employee.today,
        week: employee.week,
        month: employee.month,
        sixMonths: employee.sixMonths,
        year: employee.year
      }
    }))
  };

  const json = JSON.stringify(jsonData, null, 2);
  downloadFile(json, `sales-report-${new Date().getTime()}.json`, "application/json");
};

// Ходимнинг сотув рақамларини олиш
function getEmployeeSales(employee: SalesEmployee, timeframe: string): number {
  switch (timeframe) {
    case "today":
      return employee.today;
    case "week":
      return employee.week;
    case "month":
      return employee.month;
    case "sixMonths":
      return employee.sixMonths;
    case "year":
      return employee.year;
    default:
      return employee.month;
  }
}

// Ходимнинг статусини олиш
function getEmployeeStatus(index: number): string {
  if (index === 0) return "🏆 Энг Яхши";
  if (index < 3) return "⭐ 3та Энг Яхши";
  return "Фаол";
}

// Файлни браузер орқали юклаш
function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
