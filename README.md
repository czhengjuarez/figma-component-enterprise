# Figma Component Enterprise Analytics

A comprehensive tool for analyzing Figma component libraries with enterprise-grade analytics, providing health metrics, usage insights, team adoption data, and exportable reports for design system management.

**Last Updated**: August 16, 2025

## 🔄 Converting to Standard Version

To convert this enterprise version back to a standard component analysis tool (without enterprise analytics):

### Quick Conversion Steps:
1. **Hide Enterprise Toggle**: In `src/App.tsx`, find the enterprise mode toggle button and set `style={{ display: 'none' }}` or remove it entirely
2. **Expand Component List**: In `src/App.tsx`, change `const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(false)` to `useState(false)` to show the component inventory expanded by default

### Detailed Instructions:
```typescript
// In src/App.tsx

// Step 1: Hide the enterprise toggle (around line 720-740)
// Find this section and hide or remove it:
<button
  onClick={() => setIsEnterpriseMode(!isEnterpriseMode)}
  className="..."
  style={{ display: 'none' }} // Add this line to hide
>
  Enterprise Analytics
</button>

// Step 2: Show component inventory by default (around line 47)
// Change this line:
const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(false); // Change true to false
```

The standard version will then function as a regular component health analyzer without enterprise features, using only the standard Figma API for component analysis.

## 🚀 Features

### Core Analytics
- **Component Inventory Analysis**: Analyze any Figma file to get a complete component inventory
- **Health Scoring**: Intelligent scoring based on documentation quality, usage patterns, and maintenance status
- **Hierarchical Display**: Organized view with base components and expandable variants
- **CSV Export**: Download detailed reports for further analysis and team sharing
- **Real-time Thumbnails**: Visual component previews directly from Figma

### Enterprise Analytics (Figma Enterprise Plans)
- **Usage Trends**: 4-week historical data showing component insertion/detachment patterns
- **Team Adoption Metrics**: Track which teams are using components and adoption percentages
- **Library Analytics Integration**: Real-time data from Figma's Library Analytics API
- **Adoption Rate Calculation**: Percentage of components actively being used across files
- **Active Team Tracking**: Monitor component usage across different teams (excluding drafts)
- **Weekly vs Total Metrics**: Compare current week activity against 4-week totals

### Technical Features
- **Unified Worker Architecture**: Single Cloudflare Worker handling both frontend and API
- **Dual API Support**: Standard Figma API for all users, Library Analytics API for Enterprise
- **Component Validation**: Automatic detection of published component libraries
- **Error Handling**: Detailed error messages with actionable guidance
- **Professional UI**: Clean, modern interface with intuitive navigation

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS v3
- **Backend**: Cloudflare Workers (unified deployment)
- **APIs**: Figma REST API v1 + Library Analytics API (Enterprise)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Cloudflare Workers

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for deployment)
- Figma Personal Access Token (with appropriate scopes)
- Figma file viewing permissions
- Figma Enterprise plan (for Library Analytics features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd figma-components
npm install
cd backend
npm install
```

### 2. Local Development Workflow

⚠️ **IMPORTANT**: Due to networking limitations in the local `wrangler dev` environment, the recommended development workflow is:

#### Frontend Development (Recommended)
```bash
# Start frontend dev server (uses deployed backend)
npm run dev
# Frontend: http://localhost:3002
# Backend: Uses production deployment automatically
```

#### Backend Development (Use Separate Worker)
⚠️ **CRITICAL WARNING**: Never deploy directly to the production worker during development as it will disrupt the live version.

**For Backend Changes:**
1. **Create a separate test worker** in Cloudflare Workers dashboard
2. **Update `wrangler.toml`** to use your test worker name:
   ```toml
   name = "figma-component-health-test-[your-name]"  # Change this!
   ```
3. **Deploy to your test worker**:
   ```bash
   cd backend
   wrangler deploy
   ```
4. **Update frontend** to use your test worker URL temporarily:
   ```typescript
   // In src/App.tsx, change the URLs to your test worker:
   const response = await fetch('https://your-test-worker.workers.dev/api/analyze', {
   ```
5. **Test thoroughly** before deploying to production
6. **Deploy to production** only when changes are verified

#### Why This Workflow?
- Local `wrangler dev` has SSL/networking issues with Figma API
- Production Cloudflare Workers environment works perfectly
- Prevents accidental disruption of live production version
- Allows safe testing of backend changes

### 3. Production Deployment

**Frontend + Backend (Unified)**:
```bash
cd backend
npm run build-and-deploy
```

**Backend Only**:
```bash
cd backend
wrangler deploy
```
