# Sales Performance Dashboard

A professional React-based sales employee ranking dashboard with real-time Google Sheets integration, interactive leaderboards, and employee ranking visualizations.

## Project Status

- **Project Type**: React + TypeScript Modern Web Application  
- **Entry Point**: `src/main.tsx` (React application entry)
- **Build System**: Vite 7.0.0
- **Styling System**: Tailwind CSS 3.4.17
- **Current Phase**: MVP Complete with Google Sheets Integration (Phase 2/3)

## Key Features Implemented

### Dashboard Features
- **Live Google Sheets Integration**: Automatically fetches and displays data from your Google Sheet
- **Top Performer Section**: Dynamically highlights the employee with highest sales for the selected period
- **KPI Summary Cards**: 
  - Total Sales for selected timeframe
  - Active Employees count
  - Average Sales per Employee
  - Each card with gradient icons and hover effects
- **Interactive Employee Leaderboard**:
  - Ranks employees by total sales performance
  - Shows Top 3 with medal emojis (🥇🥈🥉)
  - Displays employee name, branch, and sales metrics
  - Status badges with gradient backgrounds (🏆 Top, ⭐ Top 3, Active)
  - Hover animations and color transitions
- **Time Period Filters**: 
  - Preset options: Today, This Week, This Month, Last 6 Months, This Year
  - **Custom Date Range Picker**: Select any start and end date
  - Dynamically calculated sales for custom date ranges
  - Date range display in KPI cards and leaderboard
- **Branch Filter**: All Branches or specific branch selection
- **Refresh Button**: Manually refresh data from Google Sheets
- **Loading & Error States**: Professional loading spinners and error handling with retry functionality
- **Data Caching**: 5-minute cache to optimize performance and reduce API calls

### Professional Styling
- **Dark Premium Aesthetic**: Dark slate-900 gradient background with emerald/teal accent colors
- **Color Palette**:
  - Primary accent: Emerald-500 to Teal-500 gradients
  - Secondary: Blue-400 and Violet-400 for KPI card icons
  - Background: Slate-900 with semi-transparent overlays and backdrop blur
  - Text: White with slate-400/500 for secondary information
- **Typography**:
  - Large bold headers (5xl-6xl) for dashboard title
  - Semibold medium text (2xl-3xl) for KPI values
  - Uppercase tracking for labels and badge text
  - Professional font hierarchy with proper spacing
- **Interactive Elements**:
  - Button scale animations (selected state: scale-105)
  - Card hover effects with shadow and border color transitions
  - Smooth transitions (300ms) on all interactive elements
  - Backdrop blur effects for depth and glass-morphism style
  - RefreshCw loading animation for data fetching
- **Visual Hierarchy**:
  - Gradient badge for "PERFORMANCE HUB" label at top
  - Emerald borders and accents for premium feel
  - Icon containers with gradient backgrounds
  - Top performer section with enhanced styling

### Google Sheets Integration
- **CSV Export Integration**: Fetches data via Google Sheets CSV export URL
- **Smart Date Range Filtering**: Aggregates sales by Today, Week, Month, 6 Months, Year
- **Employee Aggregation**: Groups sales records by employee name and branch
- **Robust Parsing**: 
  - Handles multiple date formats (ISO, MM/DD/YYYY, DD/MM/YYYY)
  - Supports quoted CSV fields
  - Flexible column detection with multiple search terms
  - Safe integer parsing with fallbacks
- **Error Handling**: Comprehensive error messages guide users on CORS and data issues
- **Fallback Mechanisms**: Attempts direct fetch, backend proxy, and caching strategies
- **Cache System**: 5-minute in-memory cache reduces load on Google Sheets API

### Technical Implementation
- Functional React components with TypeScript
- Client-side state management using `useState` and `useEffect`
- Async data fetching with proper loading/error states
- CSV parsing with quoted field support
- Responsive design for mobile and desktop
- Currency formatting with Intl.NumberFormat
- Premium dark-mode UI with Tailwind CSS
- Lucide icons for visual hierarchy
- Smooth animations and transitions throughout

## Development Commands

```bash
# Install dependencies
npm install

# Build project for production
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### Main Application Structure
- **src/App.tsx**: Complete dashboard implementation with Google Sheets integration
  - Data fetching and error handling
  - Time period and branch filtering logic
  - KPI calculations and metrics
  - Responsive component layout with Tailwind CSS
  - Premium dark-mode styling with gradients and animations

- **src/api/googleSheets.ts**: Google Sheets data fetching service
  - CSV export URL construction
  - CSV parsing with quoted field support
  - Date range aggregation logic
  - Cache management
  - Robust error handling

### Data Schema
```typescript
interface SalesEmployee {
  id: string;
  name: string;
  branch: string;
  today: number;        // Daily sales
  week: number;         // Weekly aggregate
  month: number;        // Monthly aggregate
  sixMonths: number;    // 6-month total
  year: number;         // Yearly total
}
```

### Google Sheet Column Mapping
The integration automatically detects columns containing:
- **Employee Name**: "Hisobot kirituvchi" or "FISh"
- **Branch**: "Filialingizni tanlang"
- **Date**: "Bugungi kunni" or "Timestamp"
- **Contracts**: "Shartnoma soni"
- **$3000 Invoices**: "Yuqori bonusli $3000"
- **$1400 Invoices**: "Bugungi $1400"
- **$900 Invoices**: "Bugungi $900"
- **$500 Invoices**: "Bugungi $500"
- **6M Payments**: "6 MLN to'lovlar"

### Time Period Aggregation
- **Today**: Sales from today (current date)
- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **Last 6 Months**: Last 180 days
- **This Year**: Last 365 days

## Color System

### Primary Colors
- **Accent Gradient**: Emerald-500 to Teal-500 (buttons, badges, accents)
- **Secondary Accents**: Blue-400, Cyan-500 (KPI icons), Violet-400, Purple-500 (average sales)
- **Background**: Slate-900 with slate-800 overlays
- **Borders**: Slate-700 with emerald-500 on hover

### Text Colors
- **Primary**: White (#FFFFFF)
- **Secondary**: Slate-400
- **Tertiary**: Slate-500
- **Muted**: Slate-600

### Component-Specific Colors
- **Top Performer**: Emerald/Teal gradient background with emerald-500/40 border
- **KPI Cards**: Slate-800/80 background with gradient icon backgrounds
- **Leaderboard**: Emerald-900/20 for top performer row, slate-800/30 for top 3
- **Status Badges**: Gradient emerald (top), blue (top 3), slate (active)

## Google Sheets Setup Requirements

1. **Sheet Structure**: Your Google Sheet should have columns for:
   - Employee name
   - Branch/Location
   - Date of report
   - Sales metrics (invoices, contracts, payments)

2. **Sharing Settings**: The sheet should be accessible via public URL or Youware Backend proxy

3. **Sheet URL**: Update `SHEET_ID` and `SHEET_GID` in `src/api/googleSheets.ts` with your sheet details
   - Extract ID from URL: `docs.google.com/spreadsheets/d/{ID}/edit`
   - Sheet GID is in the URL: `#gid={GID}`

4. **Data Format**: 
   - One row per employee report
   - Numerical values in sales columns
   - Consistent date format (MM/DD/YYYY or ISO format)
   - Employee names in consistent format

## CORS and Proxy Configuration

The dashboard attempts multiple strategies to fetch data:

1. **Direct Fetch**: Tries to fetch directly from Google Sheets CSV export
2. **Backend Proxy**: Falls back to `/api/proxy/sheets` if available (requires Youware Backend)
3. **Cached Data**: Uses 5-minute cache to reduce API calls

### Enabling Backend Proxy
If CORS issues occur:
1. Enable Youware Backend in your project settings
2. The dashboard will automatically use the backend proxy endpoint
3. No code changes required

## Custom Date Range Feature

### Implementation Details
- **Date Picker UI**: Modal popup with start and end date inputs
- **Calendar Toggle**: Opens custom date picker when "Custom Range" is selected
- **Date Display**: Shows selected date range in KPI cards (format: YYYY-MM-DD to YYYY-MM-DD)
- **Sales Calculation**: 
  - For custom ranges, estimates sales based on daily average (using monthly data / 30)
  - Accurate calculation when date range includes today (uses today's actual sales)
- **State Management**:
  - `customDateStart`: Start date (ISO format)
  - `customDateEnd`: End date (ISO format)
  - `showDatePicker`: Toggle custom date picker visibility
- **UI Components**:
  - Close button (✕) to hide date picker
  - Confirmation message showing selected date range
  - Styled consistently with dashboard theme

### Usage
1. Click "Custom Range" button in Time Period filter
2. Date picker appears with calendar inputs
3. Select start and end dates
4. Dashboard automatically updates with custom range sales
5. All KPI cards and leaderboard reflect the selected custom range

## Uzbek Language Localization & Data Source Documentation

### Language Support
- **Translation File**: `src/i18n.ts` - Complete Uzbek translations for all UI elements
- **Dashboard UI**: Fully translated to Uzbek (меню, этикетки, сообщения об ошибках)
- **Date Formatting**: Uses `uz-UZ` locale for proper number formatting

### Sales Numbers Source Documentation
- **File**: `SALES_DATA_SOURCES.md` - Comprehensive guide showing where every number comes from
- **Data Flow**:
  1. Google Sheets CSV (public sheet with sales data)
  2. `src/api/googleSheets.ts` - Parses CSV and aggregates sales
  3. `src/App.tsx` - Displays formatted numbers without $ symbol
- **Number Formatting**: Removed $ symbol; displays only numeric values (e.g., 1 500 000)
- **Google Sheet Columns Used**:
  - "Shartnoma soni" (Contracts)
  - "Yuqori bonusli $3000", "Bugungi $1400", "Bugungi $900", "Bugungi $500" (Invoice amounts)
  - "6 MLN to'lovlar" (6M Payments)
- **Aggregation Logic**: `saleAmount = contracts + payment6mln + invoice3000 + invoice1400 + invoice900 + invoice500`
- **Time Period Calculations**: Date-based aggregation for today, week, month, 6 months, year

## Next Development Phases

### Phase 3: Advanced Features (Remaining)
- Implement detail expansion for daily trends
- Create trend sparkline charts
- Add export functionality (CSV/PDF)
- Implement email notifications for top performers
- Add employee target/goal tracking
- Backend integration for accurate custom date range calculations

### Future Enhancements
- Real-time updates via WebSocket
- Historical data comparison and trends
- Team performance analytics
- Customizable KPI metrics
- Dark/Light theme toggle
- Mobile app version

## Build Configuration

The project uses Vite for optimized builds:
- **Output**: `dist/` directory
- **Development server**: `http://127.0.0.1:5173`
- **HMR**: Hot Module Replacement enabled
- **Build size**: ~169KB (gzipped ~52KB)

## Design Principles Applied

- **Context-Driven Design**: Dashboard tailored for sales team competition and transparency
- **Modern Aesthetics**: Dark premium theme with emerald accents and gradient effects
- **Visual Hierarchy**: KPI cards with icons, top performer highlight, detailed leaderboard
- **Interactive Feedback**: Dynamic filtering, responsive controls, hover animations
- **Responsive Layout**: Mobile-first design with grid-based layout and backdrop blur effects
- **Professional Polish**: Smooth transitions, premium color palette, proper spacing and typography
- **Accessibility**: Clear data presentation, readable text contrast, semantic HTML

## Important Notes

- **Data Currency**: Uses 5-minute cache to balance freshness and performance
- **Currency Format**: All values displayed in USD with no decimal places
- **Timezone**: Uses browser timezone for date interpretation
- **Dark Theme**: Optimized for dark-mode viewing (emerald/teal accents)
- **CSV Parsing**: Handles quoted fields, multiple date formats, and malformed data gracefully
- **CORS**: Handles CORS restrictions with fallback strategies and helpful error messages

## Styling Standards

### Button Styling
- Default: `bg-slate-700/50 text-slate-300 border border-slate-600`
- Hover: `hover:bg-slate-600/50 hover:text-white`
- Active: `bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50 scale-105`
- Disabled: `disabled:opacity-50`

### Card Styling
- Background: `bg-slate-800/80 backdrop-blur border border-slate-700`
- Hover: `hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/50`
- Icon container: `w-12 h-12 rounded-lg bg-gradient-to-br from-[color]/20 to-[color]/20`

### Typography Standards
- Headers: `font-bold text-white`
- Labels: `font-bold text-slate-400 uppercase tracking-wider`
- Values: `font-bold text-white text-4xl` (for metrics)

## Testing Google Sheets Integration

To test with a sample sheet:
1. Create a Google Sheet with columns: Date, Name, Branch, Sales (or similar)
2. Make it publicly accessible
3. Copy the sheet ID from the URL
4. Update `SHEET_ID` in `src/api/googleSheets.ts`
5. Optionally update `SHEET_GID` if using a specific sheet tab
6. Run the dashboard - it should automatically fetch and display data

## Troubleshooting

### CORS Errors
- **Issue**: "CORS policy: Request header field x-project-id is not allowed"
- **Solution**: Enable Youware Backend in project settings, or ensure sheet is publicly accessible

### No Data Displayed
- **Issue**: Sheet loads but shows "No data available"
- **Solution**: Check that sheet columns match expected headers, verify data format is correct

### Loading State Never Completes
- **Issue**: Dashboard stuck on "Loading sales data..."
- **Solution**: Click "Try Again" button, check browser console for detailed error messages

## File Locations

- Main dashboard: `src/App.tsx`
- Google Sheets service: `src/api/googleSheets.ts`
- Styling: `src/index.css` (Tailwind imports)
- Config files: `tailwind.config.js`, `vite.config.ts`, `tsconfig.json`

## Future Considerations

1. **Real-time Updates**: Implement WebSocket connection for live data
2. **Backend Integration**: Use Youware Backend for secure data handling
3. **Database**: Store historical data for trend analysis
4. **Authentication**: Implement user login to show personalized views
5. **Notifications**: Email alerts for top performers and milestones
6. **Analytics**: Add detailed analytics and reporting features
