# 📊 Сатув Маълумотларининг Манбаси - Фарқли Толиқ Тахлил

## 🎯 Ўзаро Сўзсутган

Барча сатув рақамлари **Google Sheets CSV файлидан** ўқилади ва `src/api/googleSheets.ts` файлида агрегирланади.

---

## 📁 Файл Структураси ва Манбалар

### 1️⃣ **google Sheet CSV Data** 
- **Файл**: Google Sheets (доимий маълумот манбаси)
- **URL**: `https://docs.google.com/spreadsheets/d/1E_yqnR4cXBMwwdzDd34ImsC7G4npHgAFWBAwMBQRsho/export?format=csv&gid=1714172454`
- **Формати**: CSV маълумотлари (таб ҳамда қўтириди билан қўффил қилинган)

---

## 📊 Google Sheet Устунлари ва Рақамлар

| Google Sheet Устуни | Қўлланилиши | Сўкамалан |
|---|---|---|
| **"Hisobot kirituvchi"** / **"FISh"** | Ишчи исми | Ишчини аниқлаш |
| **"Filialingizni"** / **"Filial"** | Филиал номи | Филиаль гуруслаш |
| **"Bugungi kunni"** / **"Timestamp"** | Ҳисоботнинг санаси | Вақт диапазонидан сўзғич қилиш |
| **"Shartnoma soni"** | Шартномалар сони | ✅ Рақам: `contracts` |
| **"Yuqori bonusli $3000"** | 3000 сўмли ҳиджжа-расанилар | ✅ Рақам: `invoice3000` |
| **"Bugungi $1400"** | 1400 сўмли шуғулан | ✅ Рақам: `invoice1400` |
| **"Bugungi $900"** | 900 сўмли шуғулан | ✅ Рақам: `invoice900` |
| **"Bugungi $500"** | 500 сўмли шуғулан | ✅ Рақам: `invoice500` |
| **"6 MLN to'lovlar"** | 6 миллион сўм | ✅ Рақам: `payment6mln` |

---

## 🔢 Рақамлар Ҳисобланадиган Жойлар

### **googleSheets.ts: `parseSheetData()` функциясида**

```typescript
// Сатрови рақамини парс қилиш (Line ~190-197)
const contracts = safeParseInt(fields[contractIdx]);        // Шартномалар сони
const invoice3000 = safeParseInt(fields[invoice3000Idx]);   // 3000 сўм
const invoice1400 = safeParseInt(fields[invoice1400Idx]);   // 1400 сўм
const invoice900 = safeParseInt(fields[invoice900Idx]);     // 900 сўм
const invoice500 = safeParseInt(fields[invoice500Idx]);     // 500 сўм
const payment6mln = safeParseInt(fields[payment6mlnIdx]);   // 6М сўм

// ЖАМИ САТУВ РАҚАМИ ҲИСОБЛАНАДИ (Line ~199)
const saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500;
// Натија: Ишчи учун жами сатув рақами
```

### **Вақт Диапазони Ҳисобланадиган Жойлар**

```typescript
// googleSheets.ts: Line ~126-142
const today = new Date();
const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);      // 7 кун аввал
const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);    // 30 кун аввал
const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 кун аввал
const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);   // 365 кун аввал

// Рақамларни вақт доирасига сўзғич қилиш (Line ~227-240)
if (dateForComparison === todayStr) {
  employee.today += saleAmount;          // Буғун
}
if (dateForComparison >= weekAgoStr) {
  employee.week += saleAmount;           // Ушбу ҳафта
}
if (dateForComparison >= monthAgoStr) {
  employee.month += saleAmount;          // Ушбу ой
}
if (dateForComparison >= sixMonthsAgoStr) {
  employee.sixMonths += saleAmount;      // Охирги 6 ой
}
if (dateForComparison >= yearAgoStr) {
  employee.year += saleAmount;           // Ушбу йил
}
```

---

## 📈 App.tsx файлида Рақамлар Кўринадиган Жойлар

| Жойи | Кўллаш | Манба |
|---|---|---|
| **Жами Сатув** | KPI картасида | `totalSales = sortedData.reduce((sum, emp) => sum + emp[selectedTimeframe], 0)` |
| **Фаол Ишчилар** | KPI картасида | `activeEmployees = sortedData.length` |
| **О'рта Сатув** | KPI картасида | `averageSalesPerEmployee = totalSales / activeEmployees` |
| **Энг Яхши Ишчи** | Top Performer сўзви | `topPerformer = sortedData[0]` |
| **Лидербордан** | Харҳ ишчи сўстра | `formatCurrency(employee[selectedTimeframe])` |

---

## 🔗 Вақт Диапазони ва Рақамлар Боғланиши

### **Буғун (today)**
- ✅ Қўлланилувчи: Google Sheets "Bugungi kunni" устунидан шуғун санаси `=== today`
- ✅ Рақам: `contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500`

### **Ушбу Ҳафта (week)**
- ✅ Қўлланилувчи: Охирги 7 кун ичидаги сўстрала
- ✅ Рақам: Жами (contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500)

### **Ушбу Ой (month)**
- ✅ Қўлланилувчи: Охирги 30 кун ичидаги сўстрала
- ✅ Рақам: Жами (contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500)

### **Охирги 6 Ой (sixMonths)**
- ✅ Қўлланилувчи: Охирги 180 кун ичидаги сўстрала
- ✅ Рақам: Жами (contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500)

### **Ушбу Йил (year)**
- ✅ Қўлланилувчи: Охирги 365 кун ичидаги сўстрала
- ✅ Рақам: Жами (contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500)

---

## 💾 Рақамлар Форматирования

### **App.tsx: `formatCurrency()` функцияси**
```typescript
// Line ~91-95 
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("uz-UZ").format(value);
  // Натија: 1500000 (доллар белгиси қўшилмади)
};
```

**Өзгартирилганлиғи:**
- ❌ Аввал: `$1,500,000` (доллар белгиси)
- ✅ Ҳозир: `1 500 000` (сўм, орус ҳангамасида сўзғич)

---

## 🏗️ Ўшбирман Харита

```
Google Sheets CSV файли
        ↓
fetchGoogleSheetData() (googleSheets.ts:34)
        ↓
parseSheetData() (googleSheets.ts:76)
        ↓
CSV сўстрани парс қилиш + Рақамлар ҳисобланиш
(Шартномалар + 3000 + 1400 + 900 + 500 + 6М)
        ↓
SalesEmployee объектларини яратиш
(today, week, month, sixMonths, year)
        ↓
App.tsx файлидаги компонентлар
        ↓
UI-да кўринади (💰 рақамсиз)
```

---

## 📝 Хутжа

**Ҳар бир рақам қаторидан:**
1. Google Sheet сўстрасидан ўқилади
2. `googleSheets.ts` файлида агрегирланади
3. `App.tsx` файлида форматирланади ва кўрсатилади
4. **$ белгисиз** (фақат сўм қийматлари)

