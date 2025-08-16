# Figma Component Enterprise Analytics

A comprehensive enterprise-grade analytics platform for Figma design systems with advanced component health scoring, WCAG accessibility compliance analysis, and team usage insights.

## 🚀 Features

### Core Analytics
- **Advanced Health Scoring**: 100-point scoring system with accessibility, documentation, and usage metrics
- **WCAG 2.2 Compliance**: Real-time color contrast analysis via component thumbnails
- **Enterprise Usage Analytics**: Team adoption, insertion trends, and component lifecycle insights
- **Multi-file Support**: Analyze entire design system libraries simultaneously

### Enterprise Enhancements
- **Team Consolidation**: Unified team usage analytics across 8+ teams
- **Usage Trends**: Weekly insertion/detachment tracking with 3500-4500 insertion scale
- **Component Breakdown**: Individual component analytics with team-level adoption data
- **Realistic Mock Data**: Enterprise-scale data simulation matching live API responses

### Technical Features
- **Real-time Analysis**: Live component health monitoring with progress tracking
- **Accessibility Excellence**: Comprehensive WCAG 2.2 color contrast analysis
- **Scalable Architecture**: Unified Cloudflare Worker deployment with Express.js fallback

## 📊 Enterprise Analytics Scale

This version includes realistic enterprise-scale mock data:
- **Total Insertions**: 3,500-4,500 (matching live API ~3,936)
- **Weekly Usage**: 700-1,100 insertions per week
- **Team Coverage**: Exactly 8 teams (matching live API structure)
- **Component Count**: 37 total components with realistic health distribution

## 🛠 Getting Started

### Prerequisites

- Node.js 18+
- Figma Personal Access Token (with file access permissions)
- Figma File Key(s) from your design system library

### Quick Setup

1. **Clone and Install**:
```bash
git clone https://github.com/czhengjuarez/figma-component-enterprise.git
cd figma-component-enterprise
npm run setup
```

2. **Start Development Servers**:
```bash
# Backend (port 8787)
npm run start:backend

# Frontend (port 3000) - new terminal
npm run dev
```

3. **Access Application**: Open http://localhost:3000

### Configuration

1. **Figma Personal Access Token**:
   - Figma → Settings → Personal Access Tokens
   - Generate token with file access permissions

2. **File Key Extraction**:
   - From Figma URL: `figma.com/file/[FILE_KEY]/...`
   - Use the FILE_KEY portion in the analytics interface

## 🏗 Architecture

### Frontend Stack
- **React 19** + TypeScript + Vite
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Real-time Progress Tracking**

### Backend Stack
- **Express.js** API server (development)
- **Cloudflare Workers** (production deployment)
- **Figma API Integration** with enterprise analytics
- **WCAG 2.2 Compliance Engine**

### Deployment Options
- **Local Development**: Express.js server
- **Production**: Unified Cloudflare Worker
- **Hybrid**: API + Static asset serving

## 📈 Health Scoring System

### Scoring Methodology (0-100 scale)

**Critical Issues (-50 points each)**:
- Deprecated component status
- Broken layout dimensions
- WCAG 2.2 accessibility violations

**Major Issues (-25 points each)**:
- Poor/missing documentation (< 10 characters)
- Missing key interaction variants

**Minor Issues (-10 points each)**:
- Naming convention violations
- Missing/broken thumbnails
- Inconsistent property patterns

**Bonus Points (+10-15 points each)**:
- Excellent documentation with examples
- WCAG AAA compliance (15 pts)
- Design system pattern adherence
- Complete component structure

### WCAG 2.2 Integration
- **Real-time Contrast Analysis**: Component thumbnail color extraction
- **Automated Compliance Scoring**: AA/AAA level detection
- **Accessibility Excellence Bonus**: Up to 15 additional points

## 🚀 API Endpoints

### Core Analysis
- `POST /api/analyze` - Component health analysis
- `GET /api/component/:fileKey/:componentId` - Component details

### Enterprise Analytics
- `POST /api/analytics/enterprise-summary` - Comprehensive usage metrics
- `POST /api/analytics/usage-trends` - 4-week trend analysis
- `POST /api/analytics/component-actions` - Insertion/detachment data
- `POST /api/analytics/component-usages` - Team adoption metrics

### Health & Status
- `GET /health` - API health check

## 🔧 Deployment

### Cloudflare Workers (Production)
```bash
npm run deploy
```

### Development Environment
```bash
npm run deploy:dev
```

### Local Testing
```bash
npm run test:deploy  # Dry run deployment
```

## 📝 Enterprise Features

### Team Analytics
- **8-Team Consolidation**: Matches live API team structure
- **Cross-team Usage Tracking**: Component adoption across teams
- **Team-specific Metrics**: Individual team performance insights

### Usage Intelligence
- **Weekly Trend Analysis**: 4-week rolling usage patterns
- **Component Lifecycle**: First use, peak adoption, deprecation tracking
- **Insertion/Detachment Ratios**: Component stability metrics

### Accessibility Excellence
- **WCAG 2.2 Compliance**: Latest accessibility standards
- **Color Contrast Analysis**: Real-time thumbnail processing
- **Accessibility Scoring**: Integrated into health metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/czhengjuarez/figma-component-enterprise/issues)
- **Documentation**: See `/docs` directory
- **Enterprise Support**: Contact repository maintainers

---

**Enterprise Analytics for Design Systems** - Built with ❤️ for design teams scaling component libraries...
