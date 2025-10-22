# Weather Insights Frontend (Multi-Agent)

A modern React-based user interface for the Weather Insights and Forecast Advisor system using a **multi-agent architecture**.

## Architecture

This frontend connects to **5 specialized backend agents** instead of a single monolithic agent:

- **Alerts Snapshot Agent** (Port 8081) - Active weather alerts
- **Forecast Agent** (Port 8082) - 7-day weather forecasts
- **Risk Analysis Agent** (Port 8083) - Risk assessment and recommendations
- **Emergency Resources Agent** (Port 8084) - Shelters, hospitals, evacuation routes
- **Chat Orchestrator** (Port 8090) - Conversational queries with topic routing

**Built for Agents for Impact '25 - Climate & Public Safety Track**

---

## Features

### 🌤️ Real-Time Weather Intelligence
- 7-day weather forecasts with hourly breakdowns
- Active weather alerts with severity filtering
- Current conditions from live NWS stations
- Hurricane tracking and severe weather monitoring

### 📍 Location & Navigation Services
- Emergency shelter finder with distance calculations
- Hospital and medical facility locator
- Evacuation route planning with alternatives
- Interactive maps with resource markers

### 📊 Risk Analysis & Assessment
- Two-tier risk analysis (simple vs complex events)
- Vulnerable population identification
- Evacuation priority lists with risk scores
- Resource allocation recommendations

### 🚨 Emergency Response Planning
- Timeline-based action plans
- Resource capacity calculations
- Census tract demographic analysis
- Historical weather event comparisons

---

## Technology Stack

- **React 18** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Heroicons** - Icon library
- **Axios** - HTTP client for API calls
- **Recharts** - Data visualization (planned)
- **Leaflet** - Interactive maps (planned)

---

## Project Structure

```
weather-insights-ui/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Main layout with navigation
│   │   └── AlertCard.jsx       # Reusable alert card component
│   ├── pages/
│   │   ├── Dashboard.jsx       # Home page with active alerts
│   │   ├── Forecast.jsx        # Weather forecast search
│   │   ├── Alerts.jsx          # Alert list with filtering
│   │   ├── RiskAnalysis.jsx    # Risk assessment tool
│   │   └── EmergencyResources.jsx  # Shelter/hospital finder
│   ├── services/
│   │   └── api.js              # API integration layer
│   ├── App.js                  # Root component with routing
│   ├── index.css               # Global styles with Tailwind
│   └── index.js                # Application entry point
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Dependencies
```

---

## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### Prerequisites

```bash
# Node.js 16+ and npm required
node --version
npm --version
```

### Installation

```bash
# Navigate to the frontend directory
cd weather-insights-ui

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the `weather-insights-ui` directory:

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:8000

# Optional: Google Maps API Key (for map features)
REACT_APP_GOOGLE_MAPS_KEY=your-api-key-here
```

### Development

```bash
# Start the development server
npm start
```

Opens [http://localhost:3000](http://localhost:3000) in your browser.

The page will reload when you make changes. Lint errors will appear in the console.

### Production Build

```bash
# Build optimized production bundle
npm run build
```

Creates a `build/` folder with minified, production-ready files.

### Testing

```bash
# Run test suite
npm test
```

Launches the test runner in interactive watch mode.

---

## API Integration

The frontend communicates with the Weather Insights agent backend through the API service layer.

### API Service (`src/services/api.js`)

Provides methods for all agent interactions:

```javascript
import api from './services/api';

// Get weather forecast
const forecast = await api.getForecast('Miami, FL');

// Get active alerts
const alerts = await api.getAlerts('California');

// Find emergency shelters
const shelters = await api.findShelters('Houston, TX', 10);

// Calculate evacuation routes
const routes = await api.getEvacuationRoute('Tampa', 'Orlando');

// Perform risk analysis
const analysis = await api.analyzeRisk('hurricane', 'Miami-Dade County');
```

### Backend Requirements

The frontend expects the backend agent to be running at `http://localhost:8000` (configurable via `REACT_APP_API_URL`).

Start the backend:
```bash
cd ..
adk web  # Starts agent at http://localhost:8000
```

---

## Design System

### Color Palette

**Alert Severity:**
- 🔴 Extreme: `#DC2626` (red-600)
- 🟠 Severe: `#EA580C` (orange-600)
- 🟡 Moderate: `#F59E0B` (amber-500)
- 🔵 Minor: `#3B82F6` (blue-500)
- 🟢 Safe: `#10B981` (green-500)

**UI Colors:**
- Primary: `#1E40AF` (blue-800)
- Secondary: `#6366F1` (indigo-500)
- Background: `#F9FAFB` (gray-50)

### Typography

- Font Family: Inter (Google Fonts)
- Headings: Inter Bold (700)
- Body: Inter Regular (400)
- Data/Numbers: Inter Medium (500)

### Spacing

- Base Unit: 8px
- Scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px

---

## Deployment

### Development Deployment

```bash
# Start backend agent
cd ..
adk web

# Start frontend (in new terminal)
cd weather-insights-ui
npm start
```

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Production Deployment

**Option 1: Static Hosting (Netlify, Vercel)**

```bash
# Build production bundle
npm run build

# Deploy build/ folder to hosting service
# Configure REACT_APP_API_URL to point to production backend
```

**Option 2: Docker Container**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
EXPOSE 3000
```

**Option 3: Cloud Run (with backend)**

Deploy backend to Cloud Run, then configure frontend to use the Cloud Run URL.

---

## Features Implementation Status

### ✅ Completed
- Dashboard with active alerts
- Weather forecast search
- Alert list with filtering
- Risk analysis interface
- Emergency resources finder
- Responsive layout
- Navigation system
- API integration layer

### 🚧 In Progress
- Interactive map integration (Leaflet)
- Real-time data updates
- Chart visualizations (Recharts)

### 📋 Planned
- Offline support with service workers
- Push notifications for alerts
- Export reports (PDF)
- Voice command support
- Multi-language support
- Dark mode

---

## Testing

### Manual Testing Checklist

**Dashboard:**
- [ ] Active alerts display correctly
- [ ] Quick actions navigate to correct pages
- [ ] Recent analysis shows history

**Forecast:**
- [ ] Location search works
- [ ] 7-day forecast displays
- [ ] Current conditions show

**Alerts:**
- [ ] Alert cards expand/collapse
- [ ] Severity filter works
- [ ] Alert stats update

**Risk Analysis:**
- [ ] Event type selection works
- [ ] Analysis results display
- [ ] Priority list shows correctly

**Emergency Resources:**
- [ ] Shelter search works
- [ ] Hospital search works
- [ ] Evacuation routes display

---

## Troubleshooting

### Common Issues

**Issue: "Cannot connect to backend"**
```bash
# Ensure backend is running
cd ..
adk web

# Check REACT_APP_API_URL in .env
echo $REACT_APP_API_URL
```

**Issue: "Tailwind styles not applying"**
```bash
# Restart development server
npm start

# Clear cache if needed
rm -rf node_modules/.cache
```

**Issue: "Module not found"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Contributing

When adding new features:

1. Follow the existing component structure
2. Use Tailwind utility classes for styling
3. Maintain responsive design (mobile-first)
4. Add proper error handling
5. Update this README with new features

---

## Resources

- [UX Design Plan](../UX_DESIGN_PLAN.md) - Complete UX specifications
- [Testing Guide](../TESTING_GUIDE.md) - Backend testing documentation
- [Agent README](../README.md) - Backend agent documentation
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)

---

**Last Updated:** 2025-10-18  
**Version:** 1.0.0
