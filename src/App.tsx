import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, Info, TrendingUp, FileText, Download, Search, AlertCircle, ChevronDown, ChevronRight, Layers, FileCheckIcon, ArrowUpRight, Box } from 'lucide-react';
import './App.css'

interface ComponentData {
  name: string
  usageCount: number
  firstUsed?: string
  lastModified?: string
  isOrphaned: boolean
  type?: string
  description?: string
  healthScore?: number
  isDeprecated?: boolean
  variants?: number
  pageName?: string
  thumbnail_url?: string
  contrastData?: {
    dominantColors: { r: number; g: number; b: number }[]
    minContrast: number
    maxContrast: number
    avgContrast: number
    wcagAA: boolean
    wcagAAA: boolean
    wcagAALarge: boolean
  }
}

interface AnalysisProgress {
  current: number
  total: number
  stage: string
}

interface EnterpriseAnalytics {
  totalInsertions: number;
  weeklyInsertions: number;
  activeTeams: number;
  adoptionRate: number;
  usageTrends: Array<{
    week: string;
    date: string;
    insertions: number;
    detachments?: number;
  }>;
  isLoading: boolean;
  error: string | null;
  rawData?: any;
  isEnterpriseRequired?: boolean;
}

function App() {
  const [componentData, setComponentData] = useState<ComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNotLibraryFile, setIsNotLibraryFile] = useState(false);
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [showTokenTooltip, setShowTokenTooltip] = useState(false);
  const [showFileKeyTooltip, setShowFileKeyTooltip] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, stage: '' });
  const [isEnterpriseMode, setIsEnterpriseMode] = useState(false);
  const [enterpriseAnalytics, setEnterpriseAnalytics] = useState<EnterpriseAnalytics>({
    totalInsertions: 0,
    weeklyInsertions: 0,
    activeTeams: 0,
    adoptionRate: 0,
    usageTrends: [],
    isLoading: false,
    error: null,
    isEnterpriseRequired: false
  });

  // Auto-expiration clearing function for tokens
  useEffect(() => {
    const clearTokens = () => {
      setFigmaToken('');
      setFileKey('');
    };

    // Clear tokens when tab becomes hidden (user switches away)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTokens();
      }
    };

    // Clear tokens when page is about to unload (tab close/refresh)
    const handleBeforeUnload = () => {
      clearTokens();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Group components hierarchically by their base name (e.g., "Icon/Arrow/Refresh" -> "Icon")
  const groupComponents = (components: ComponentData[]) => {
    const groups: { [key: string]: { base: ComponentData, variants: ComponentData[] } } = {};
    
    components.forEach(component => {
      let baseName: string;
      let isVariant = false;
      
      // Handle different naming patterns:
      // 1. "Icon / Arrow / Refresh" -> base: "Icon"
      // 2. "Property 1=North South" -> base: "Property 1"  
      // 3. "Type=Grabbed" -> base: "Type"
      // 4. "Button" -> base: "Button" (standalone)
      
      if (component.name.includes(' / ')) {
        // Pattern: "Icon / Arrow / Refresh"
        const parts = component.name.split(' / ');
        baseName = parts[0];
        isVariant = parts.length > 1;
      } else if (component.name.includes('=')) {
        // Pattern: "Property 1=North South" or "Type=Grabbed"
        const parts = component.name.split('=');
        baseName = parts[0];
        isVariant = parts.length > 1;
      } else {
        // Standalone component
        baseName = component.name;
        isVariant = false;
      }
      
      if (!groups[baseName]) {
        // Create base component entry
        groups[baseName] = {
          base: {
            ...component,
            name: baseName,
            description: component.description || '',
            healthScore: component.healthScore || 0,
            isDeprecated: component.isDeprecated || false,
            isOrphaned: component.isOrphaned || false,
            usageCount: component.usageCount || 0,
            thumbnail_url: component.thumbnail_url // Preserve thumbnail URL
          },
          variants: []
        };
      }
      
      if (isVariant) {
        // This is a variant, add to variants array
        let variantName: string;
        if (component.name.includes(' / ')) {
          variantName = component.name.split(' / ').slice(1).join(' / ');
        } else if (component.name.includes('=')) {
          variantName = component.name.split('=').slice(1).join('=');
        } else {
          variantName = component.name;
        }
        
        groups[baseName].variants.push({
          ...component,
          name: variantName
        });
        
        // Update base component stats based on variants
        const group = groups[baseName];
        // Don't set description - we'll show variant count in the name display
        
        // Aggregate health score (average of all variants)
        const avgHealth = group.variants.reduce((sum, v) => sum + (v.healthScore || 0), 0) / group.variants.length;
        group.base.healthScore = Math.round(avgHealth);
        
        // Aggregate usage count (sum of all variants)
        group.base.usageCount = group.variants.reduce((sum, v) => sum + (v.usageCount || 0), 0);
        
        // Base is deprecated if any variant is deprecated
        group.base.isDeprecated = group.variants.some(v => v.isDeprecated);
        
        // Base is orphaned only if ALL variants are orphaned
        group.base.isOrphaned = group.variants.every(v => v.isOrphaned);
        
        // Use the first variant's thumbnail for the base component if base doesn't have one
        if (!group.base.thumbnail_url && group.variants.length > 0) {
          const firstVariantWithThumbnail = group.variants.find(v => v.thumbnail_url);
          if (firstVariantWithThumbnail) {
            group.base.thumbnail_url = firstVariantWithThumbnail.thumbnail_url;
          }
        }
      }
    });
    
    return groups;
  };

  // WCAG Contrast Analysis Functions
  const calculateLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const calculateContrastRatio = (color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }) => {
    const lum1 = calculateLuminance(color1.r, color1.g, color1.b);
    const lum2 = calculateLuminance(color2.r, color2.g, color2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const analyzeImageColors = async (imageUrl: string) => {
    return new Promise<{
      dominantColors: { r: number; g: number; b: number }[];
      minContrast: number;
      maxContrast: number;
      avgContrast: number;
      wcagAA: boolean;
      wcagAAA: boolean;
      wcagAALarge: boolean;
    }>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;

          // Extract dominant colors
          const colorCounts: { [key: string]: number } = {};
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const alpha = pixels[i + 3];

            if (alpha > 128) { // Only count non-transparent pixels
              const colorKey = `${Math.floor(r/32)*32},${Math.floor(g/32)*32},${Math.floor(b/32)*32}`;
              colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
            }
          }

          // Get top colors
          const sortedColors = Object.entries(colorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([color]) => {
              const [r, g, b] = color.split(',').map(Number);
              return { r, g, b };
            });

          // Calculate contrast ratios between dominant colors
          const contrastRatios: number[] = [];
          for (let i = 0; i < sortedColors.length; i++) {
            for (let j = i + 1; j < sortedColors.length; j++) {
              const ratio = calculateContrastRatio(sortedColors[i], sortedColors[j]);
              contrastRatios.push(ratio);
            }
          }

          const minContrast = Math.min(...contrastRatios);
          const maxContrast = Math.max(...contrastRatios);
          const avgContrast = contrastRatios.reduce((a, b) => a + b, 0) / contrastRatios.length;

          resolve({
            dominantColors: sortedColors,
            minContrast,
            maxContrast,
            avgContrast,
            wcagAA: minContrast >= 4.5,
            wcagAAA: minContrast >= 7.0,
            wcagAALarge: minContrast >= 3.0
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const enhanceComponentsWithContrastAnalysis = async (components: ComponentData[]) => {
    const enhancedComponents: ComponentData[] = [];
    const totalComponents = components.length;

    setAnalysisProgress({ current: 0, total: totalComponents, stage: 'Starting WCAG contrast analysis...' });

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      let contrastData = null;

      // Update progress
      setAnalysisProgress({ 
        current: i + 1, 
        total: totalComponents, 
        stage: `Analyzing ${component.name} (${i + 1}/${totalComponents})`
      });

      if (component.thumbnail_url && !component.thumbnail_url.includes('placeholder')) {
        console.log(`[LOCAL CONTRAST DEBUG] Starting analysis for ${component.name}`);
        console.log(`[LOCAL CONTRAST DEBUG] Thumbnail URL: ${component.thumbnail_url}`);
        console.log(`[LOCAL CONTRAST DEBUG] Original health score: ${component.healthScore}`);
        
        try {
          contrastData = await analyzeImageColors(component.thumbnail_url);
          console.log(`[LOCAL CONTRAST DEBUG] Contrast analysis result:`, contrastData);

          // Update health score based on actual contrast analysis - match deployed version
          let contrastAdjustment = 0;

          if (contrastData.wcagAAA && contrastData.minContrast >= 7.0) {
            contrastAdjustment += 15; // Real WCAG AAA compliance (+15 points) for 7:1+ contrast
            console.log(`[LOCAL CONTRAST DEBUG] Applied AAA bonus: +15 points`);
          } else if (contrastData.wcagAA && contrastData.minContrast >= 4.5) {
            contrastAdjustment += 10; // Real WCAG AA compliance (+10 points) for 4.5:1+ contrast
            console.log(`[LOCAL CONTRAST DEBUG] Applied AA bonus: +10 points`);
          } else if (contrastData.wcagAALarge && contrastData.minContrast >= 3.0) {
            contrastAdjustment += 5; // Large text compliance (+5 points) for 3:1+ contrast
            console.log(`[LOCAL CONTRAST DEBUG] Applied AA Large bonus: +5 points`);
          } else if (contrastData.minContrast < 3.0) {
            contrastAdjustment -= 25; // Contrast failures (-25 points) for below WCAG standards
            console.log(`[LOCAL CONTRAST DEBUG] Applied poor contrast penalty: -25 points`);
          }

          // Apply contrast-based health score adjustment
          const adjustedHealthScore = Math.max(0, Math.min(100, 
            (component.healthScore || 0) + contrastAdjustment
          ));

          console.log(`[LOCAL CONTRAST DEBUG] Score adjustment: ${component.healthScore} -> ${adjustedHealthScore} (adjustment: ${contrastAdjustment})`);

          enhancedComponents.push({
            ...component,
            healthScore: adjustedHealthScore,
            contrastData
          });
        } catch (error) {
          console.error(`[LOCAL CONTRAST DEBUG] Error analyzing ${component.name}:`, error);
          console.warn(`Failed to analyze contrast for ${component.name}:`, error);
          enhancedComponents.push(component);
        }
      } else {
        enhancedComponents.push(component);
      }

      // Small delay to prevent overwhelming the browser
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setAnalysisProgress({ current: totalComponents, total: totalComponents, stage: 'Analysis complete!' });
    return enhancedComponents;
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleAnalyze = async () => {
    if (!figmaToken.trim() || !fileKey.trim()) {
      setError('Please provide both Figma Personal Access Token and File Key')
      return
    }

    setIsLoading(true)
    setError('')
    setIsNotLibraryFile(false)
    
    try {
      const response = await fetch('https://figma-component-health-ent.coscient.workers.dev/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figmaToken,
          fileKeys: fileKey.split(',').map(key => key.trim()).filter(key => key)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('API Response:', data)
      console.log('API Response structure:', JSON.stringify(data, null, 2))
      console.log('Results array:', data.results)
      console.log('First result:', data.results?.[0])
      console.log('First component data:', data.results?.[0]?.components?.[0])
      console.log('Component thumbnail URLs:', data.results?.[0]?.components?.slice(0, 5).map((c: any) => ({ name: c.name, thumbnail_url: c.thumbnail_url })))

      // Check if any files returned components
      const hasComponents = data.results.some((fileResult: any) => 
        fileResult.components && fileResult.components.length > 0
      )
      
      // If no components found, check if it's because files are not libraries
      if (!hasComponents) {
        const allFilesEmpty = data.results.every((fileResult: any) => 
          !fileResult.components || fileResult.components.length === 0
        )
        
        if (allFilesEmpty) {
          setIsNotLibraryFile(true)
          setIsLoading(false)
          return
        }
      }

      // Transform the API response to match our component data structure
      const transformedData: ComponentData[] = []
      
      data.results.forEach((fileResult: any) => {
        fileResult.components.forEach((component: any) => {
          transformedData.push({
            name: component.name,
            usageCount: component.instanceCount,
            firstUsed: component.instanceCount > 0 ? 'Available in file' : undefined,
            lastModified: component.lastModified || 'Unknown',
            isOrphaned: component.isOrphaned,
            type: component.type,
            description: component.description,
            healthScore: component.healthScore,
            isDeprecated: component.isDeprecated,
            variants: component.variants,
            pageName: component.pageName,
            thumbnail_url: component.thumbnail_url
          })
        })
      })

      // Enhance components with WCAG contrast analysis
      const enhancedData = await enhanceComponentsWithContrastAnalysis(transformedData)
      
      setComponentData(enhancedData)
      
      // Fetch enterprise analytics if enterprise mode is enabled
      if (isEnterpriseMode) {
        await fetchEnterpriseAnalytics(fileKey.split(',')[0].trim()) // Use first file key for analytics
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Analysis error:', error)
      setError(error instanceof Error ? error.message : 'Failed to analyze components')
      setIsLoading(false)
    }
  }

  // Function to fetch real enterprise analytics data
  const fetchEnterpriseAnalytics = async (primaryFileKey: string) => {
    setEnterpriseAnalytics(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      console.log('Fetching enterprise analytics for file:', primaryFileKey)
      
      // Fetch both summary and trends data in parallel
      const [summaryResponse, trendsResponse] = await Promise.allSettled([
        fetch('https://figma-component-health-ent.coscient.workers.dev/api/analytics/enterprise-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            figmaToken,
            fileKeys: primaryFileKey
          }),
        }),
        fetch('https://figma-component-health-ent.coscient.workers.dev/api/analytics/usage-trends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            figmaToken,
            fileKeys: primaryFileKey
          }),
        })
      ])

      if (summaryResponse.status === 'rejected') {
        throw new Error('Network error fetching enterprise summary')
      }
      
      if (!summaryResponse.value.ok) {
        const errorData = await summaryResponse.value.json()
        throw new Error(errorData.error || `HTTP error! status: ${summaryResponse.value.status}`)
      }

      const summaryData = await summaryResponse.value.json()
      console.log('Enterprise analytics response:', summaryData)

      let trendsData = { trends: [] }
      if (trendsResponse.status === 'fulfilled' && trendsResponse.value.ok) {
        trendsData = await trendsResponse.value.json()
        console.log('Usage trends response:', trendsData)
        console.log('Individual trend values:', trendsData.trends.map((t: any) => `${t.week}: ${t.insertions} insertions, ${t.detachments} detachments`))
      } else {
        console.log('Usage trends failed, using empty data')
      }

      setEnterpriseAnalytics({
        totalInsertions: summaryData.totalInsertions || 0,
        weeklyInsertions: summaryData.weeklyInsertions || 0,
        activeTeams: summaryData.activeTeams || 0,
        adoptionRate: summaryData.adoptionRate || 0,
        usageTrends: trendsData.trends || [],
        rawData: summaryData.rawData,
        isLoading: false,
        error: null,
        isEnterpriseRequired: summaryData.isEnterpriseRequired || false
      })

      // Log any errors from individual API calls
      if (summaryData.errors && summaryData.errors.length > 0) {
        console.warn('Enterprise analytics partial errors:', summaryData.errors)
      }

    } catch (error) {
      console.error('Enterprise analytics error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch enterprise analytics'
      const isEnterpriseRequired = errorMessage.includes('Limited by Figma plan') || 
                                   errorMessage.includes('Invalid scope') ||
                                   errorMessage.includes('403')

      setEnterpriseAnalytics(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isEnterpriseRequired
      }))
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Component Name', 'Type', 'Instances', 'Health Score', 'WCAG Compliance', 'Contrast Ratio', 'Status', 'Description', 'Variants', 'Page'],
      ...componentData.map(comp => [
        comp.name,
        comp.type === 'COMPONENT_SET' ? 'Component Set' : 'Component',
        comp.usageCount.toString(),
        (comp.healthScore || 0).toString() + '%',
        comp.contrastData ? (
          comp.contrastData.wcagAAA ? 'AAA' :
          comp.contrastData.wcagAA ? 'AA' :
          comp.contrastData.wcagAALarge ? 'AA Large' : 'Poor'
        ) : 'Not Analyzed',
        comp.contrastData ? comp.contrastData.minContrast.toFixed(2) : 'N/A',
        comp.isOrphaned ? 'Unused' : 'Active' + (comp.isDeprecated ? ' (Deprecated)' : ''),
        comp.description || '',
        comp.variants ? comp.variants.toString() : '0',
        comp.pageName || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'figma-component-usage-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate stats based on grouped components (base components only)
  const groupedComponents = groupComponents(componentData);
  const baseComponents = Object.values(groupedComponents).map(group => group.base);
  
  const totalComponents = baseComponents.length;
  const wellDocumented = baseComponents.filter(c => 
    c.description && c.description.trim().length > 10
  ).length;
  const deprecatedComponents = baseComponents.filter(c => c.isDeprecated).length;
  const recentUpdates = baseComponents.filter(c => {
    if (!c.lastModified) return false;
    const lastUpdate = new Date(c.lastModified);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastUpdate > thirtyDaysAgo;
  }).length;
  const topComponents = baseComponents
    .filter(comp => comp.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 w-full">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary-500 rounded flex items-center justify-center">
              <Box className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">Figma Component Inventory & Health Reporter</h1>
              <p className="text-sm text-gray-600">Analyze component inventory, health, and structure across your Figma files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Analysis Scope Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Component Analysis Scope</h3>
          <p className="text-sm text-gray-600">
            This tool analyzes Published Library Components only (components published to your team library). You may see fewer components than Figma built-in analytics, which counts all component definitions including unpublished and local components. We focus on quality over quantity - analyzing the components that teams actually use in their design systems.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enterprise Mode Toggle */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900">Enterprise Analytics</h3>
              <span className="text-xs text-gray-600">Enable advanced usage analytics with Figma Library Analytics API</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                setIsEnterpriseMode(!isEnterpriseMode);
                // Auto-collapse inventory when enterprise mode is enabled
                if (!isEnterpriseMode) {
                  setIsInventoryCollapsed(true);
                }
              }}
              className={`relative inline-flex items-center cursor-pointer w-11 h-6 rounded-full transition-colors ${
                isEnterpriseMode ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <div className={`absolute top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                isEnterpriseMode ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>
          {isEnterpriseMode && (
            <div className="mt-3 text-xs text-purple-700 bg-purple-100 p-2 rounded text-left">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <strong>Enterprise Mode Enabled: </strong>
                  This will access real usage analytics, team insights, and cross-file adoption data using the Figma Library Analytics API. Requires Figma Enterprise plan.
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Input Form */}
        <div className="card-enhanced p-6 mb-8">
          <div className="mb-4 space-y-3">
            <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-left">
              <Info className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p><strong>Note:</strong> You need viewing permissions (viewer, editor, or owner) for the Figma file to analyze it. The tool works with your own files, shared files, and public community files.</p>
                <p className="mt-2 text-xs text-gray-600">
                  <strong>Security:</strong> Your tokens are automatically cleared when you close the tab or switch away for your privacy and security.
                </p>
              </div>
            </div>
            

          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="figmaToken" className="block text-sm font-medium text-gray-700">
                  Figma Personal Access Token
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowTokenTooltip(true)}
                    onMouseLeave={() => setShowTokenTooltip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {showTokenTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 text-left">
                      <div className="font-medium mb-2">How to get your Personal Access Token:</div>
                      <ol className="list-decimal list-inside space-y-1 text-left">
                        <li>Open Figma and go to your account settings</li>
                        <li>Navigate to "Personal Access Tokens"</li>
                        <li>Click "Create a new personal access token"</li>
                        <li>Give it a name and select "File content" scope</li>
                        <li>Copy the generated token (starts with "figd_")</li>
                      </ol>
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <input
                id="figmaToken"
                type="password"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                placeholder="figd_..."
                className="input-enhanced w-full"
              />
              <p className="text-xs text-gray-500 mt-1 text-left">
                Get your token from Figma Settings → Personal Access Tokens
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="fileKey" className="block text-sm font-medium text-gray-700">
                  Figma File Key(s)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowFileKeyTooltip(true)}
                    onMouseLeave={() => setShowFileKeyTooltip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {showFileKeyTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 text-left">
                      <div className="font-medium mb-2">How to find your File Key:</div>
                      <ol className="list-decimal list-inside space-y-1 text-left">
                        <li>Open your Figma file in the browser</li>
                        <li>Look at the URL: figma.com/file/<strong>FILE_KEY</strong>/file-name</li>
                        <li>Copy the alphanumeric string after "/file/"</li>
                        <li>For multiple files, separate keys with commas</li>
                      </ol>
                      <div className="text-xs mt-2 text-gray-300 text-left">
                        Example: abc123def456, xyz789uvw012
                      </div>
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <input
                id="fileKey"
                type="text"
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
                placeholder="abc123def456, xyz789uvw012 (comma-separated)"
                className="input-enhanced w-full"
              />
              <p className="text-xs text-gray-500 mt-1 text-left">
                Found in the Figma file URL. Separate multiple keys with commas.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isNotLibraryFile && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-md mb-4">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-orange-800 mb-1">No components found in this file</h4>
                <p className="text-sm text-orange-700 mb-2">
                  This could mean: (1) The file contains no published components or component sets, (2) The file is not a design system or component library, 
                  (3) Components exist but are not published to a team library. Try analyzing a file that contains published components or component sets.
                </p>
                <div className="text-xs text-orange-600">
                  <strong>Note:</strong> This tool analyzes published library components only. Regular design files without published components will show no results.
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner w-4 h-4" />
                Analyzing Component Inventory...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyze Component Inventory
              </>
            )}
          </button>

          {/* Progress Tracking */}
          {isLoading && analysisProgress.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {analysisProgress.stage}
                </span>
                <span className="text-sm text-gray-700">
                  {analysisProgress.current}/{analysisProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Analyzing component thumbnails for WCAG contrast compliance...
              </p>
            </div>
          )}

          {/* Processing Time Notice */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-4 text-left">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p><strong>Processing Time Notice</strong></p>
              <p className="mt-1">
                Analysis includes real-time WCAG 2.2 color contrast checking using component thumbnails. Small libraries (&lt; 20 components): ~30 seconds. Medium libraries (20-50 components): 1-2 minutes. Large libraries (50+ components): 2-4 minutes. Please be patient during analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Results - Empty State or Real Data */}
        {componentData.length > 0 ? (
          <>
            {/* Summary Cards - Real Data */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-enhanced p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Components</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {componentData.length > 0 ? totalComponents : '--'}
                  </p>
                </div>
                <Layers className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="card-enhanced p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Well-Documented</p>
                  <p className="text-2xl font-bold text-green-600">
                    {componentData.length > 0 ? wellDocumented : '--'}
                  </p>
                </div>
                <FileCheckIcon className="h-4 w-4 text-green-400" />
              </div>
            </div>
            <div className="card-enhanced p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Deprecated Components</p>
                  <p className="text-2xl font-bold text-red-600">
                    {componentData.length > 0 ? deprecatedComponents : '--'}
                  </p>
                </div>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="card-enhanced p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Updates</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {componentData.length > 0 ? recentUpdates : '--'}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary-400" />
              </div>
            </div>
          </div>

            {/* Export Button */}
            <div className="flex justify-end mb-6">
              <button onClick={handleExportCSV} className="btn-secondary-enhanced">
                <Download className="h-4 w-4" />
                Export CSV Report
              </button>
            </div>

            {/* Enterprise Analytics Section - only shown when enterprise mode is enabled */}
            {isEnterpriseMode && componentData.length > 0 && (
              <div className="mb-8">
                {/* Analytics Data Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <svg className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-900 mb-2">Analytics Data Notice</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>Data Source:</strong> Figma Library Analytics API with 30-day lookback period. Numbers and team rankings may differ from Figma's native library analytics due to:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 mb-3 ml-4">
                        <li>• Different calculation methods (cumulative vs period-specific queries)</li>
                        <li>• API grouping differences (per-component vs per-instance vs per-team)</li>
                        <li>• Date range handling and timezone variations</li>
                        <li>• Team adoption aggregation across multiple files/components</li>
                      </ul>
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>Recommendation:</strong> Use these analytics alongside Figma's native library insights for a comprehensive view of your component library health and adoption patterns.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          id="copy-api-data-btn"
                          onClick={async () => {
                            const dataToCopy = {
                              summary: {
                                totalInsertions: enterpriseAnalytics.totalInsertions,
                                weeklyInsertions: enterpriseAnalytics.weeklyInsertions,
                                activeTeams: enterpriseAnalytics.activeTeams,
                                adoptionRate: enterpriseAnalytics.adoptionRate
                              },
                              usageTrends: enterpriseAnalytics.usageTrends,
                              rawData: enterpriseAnalytics.rawData,
                              exportedAt: new Date().toISOString()
                            };
                            
                            try {
                              await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
                              // Show temporary checkmark next to the link
                              const checkmark = document.getElementById('copy-checkmark');
                              if (checkmark) {
                                // Clear any existing timeout
                                const existingTimeout = (checkmark as any)._timeout;
                                if (existingTimeout) {
                                  clearTimeout(existingTimeout);
                                }
                                
                                // Show checkmark using Tailwind classes
                                checkmark.classList.remove('hidden');
                                checkmark.classList.add('inline-block');
                                
                                // Hide after 2 seconds
                                (checkmark as any)._timeout = setTimeout(() => {
                                  checkmark.classList.remove('inline-block');
                                  checkmark.classList.add('hidden');
                                  (checkmark as any)._timeout = null;
                                }, 2000);
                              }
                            } catch (err) {
                              console.error('Failed to copy to clipboard:', err);
                            }
                          }}
                          className="text-sm text-yellow-700 underline hover:text-yellow-900 transition-colors"
                        >
                          Copy Raw API Data
                        </button>
                        <svg 
                          id="copy-checkmark"
                          className="h-4 w-4 text-green-600 hidden" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Enterprise Summary Cards - using real Library Analytics API data */}
                {enterpriseAnalytics.isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : enterpriseAnalytics.error ? (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Enterprise Analytics Error</h3>
                        <p className="text-sm text-red-700 mt-1">{enterpriseAnalytics.error}</p>
                        {enterpriseAnalytics.isEnterpriseRequired && (
                          <p className="text-xs text-red-600 mt-2">
                            <strong>Note:</strong> Library Analytics API requires a Figma Enterprise plan and a token with library_analytics:read scope.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main Analytics Cards - 4 cards in a row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Insertions</p>
                            <p className="text-2xl font-bold text-gray-800">
                              {enterpriseAnalytics.totalInsertions.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                          </div>
                          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                          </svg>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Activity this week</p>
                            <p className="text-2xl font-bold text-gray-800">
                              {enterpriseAnalytics.weeklyInsertions.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Current week</p>
                          </div>
                          <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Active Teams</p>
                            <p className="text-2xl font-bold text-gray-800">{enterpriseAnalytics.activeTeams}</p>
                            <p className="text-xs text-gray-500 mt-1">Using this library</p>
                          </div>
                          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Adoption Rate</p>
                            <p className="text-2xl font-bold text-gray-800">{enterpriseAnalytics.adoptionRate}%</p>
                            <p className="text-xs text-gray-500 mt-1">Components with usage</p>
                          </div>
                          <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                    </div>

                  </>
                )}

                {/* Enterprise Charts Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Usage Trends Chart */}
                  <div className="card-enhanced p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Usage Trends (Last 4 Weeks)</h3>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">Insertions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600">Detachments</span>
                        </div>
                      </div>
                    </div>
                    
                    {enterpriseAnalytics.usageTrends.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={enterpriseAnalytics.usageTrends.map(trend => ({
                              week: trend.week,
                              date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              insertions: trend.insertions,
                              detachments: trend.detachments
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={{ stroke: '#e5e7eb' }}
                            />
                            <Line 
                              type="linear" 
                              dataKey="insertions" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                              activeDot={false}
                              connectNulls={false}
                            />
                            <Line 
                              type="linear" 
                              dataKey="detachments" 
                              stroke="#ef4444" 
                              strokeWidth={3}
                              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                              activeDot={false}
                              connectNulls={false}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length > 0) {
                                  // Debug: log all payload data
                                  console.log('Tooltip payload:', payload.map(p => ({ dataKey: p.dataKey, value: p.value })));
                                  
                                  // Check if we have both data points
                                  const insertionsData = payload.find(p => p.dataKey === 'insertions');
                                  const detachmentsData = payload.find(p => p.dataKey === 'detachments');
                                  
                                  if (!insertionsData && !detachmentsData) return null;
                                  
                                  // For now, show both until we can debug the proximity issue
                                  return (
                                    <div style={{
                                      backgroundColor: '#1f2937',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: '#ffffff',
                                      fontSize: '12px',
                                      padding: '8px 12px'
                                    }}>
                                      <p style={{ color: '#ffffff', margin: 0, marginBottom: '4px' }}>
                                        Week: {label}
                                      </p>
                                      {insertionsData && (
                                        <p style={{ color: '#3b82f6', margin: 0 }}>
                                          Insertions: {insertionsData.value}
                                        </p>
                                      )}
                                      {detachmentsData && (
                                        <p style={{ color: '#ef4444', margin: 0 }}>
                                          Detachments: {detachmentsData.value}
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        
                        {/* Summary stats */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
                          <div className="text-gray-600">
                            Total: <span className="font-medium text-blue-600">{enterpriseAnalytics.usageTrends.reduce((sum, t) => sum + t.insertions, 0)} insertions</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium text-red-600">{enterpriseAnalytics.usageTrends.reduce((sum, t) => sum + (t.detachments || 0), 0)} detachments</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Loading usage trends...</p>
                          <p className="text-xs text-gray-400">Fetching weekly data</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Adoption Chart */}
                  <div className="card-enhanced p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Team Adoption</h3>
                      <span className="text-xs text-gray-500">{enterpriseAnalytics.activeTeams} teams using components</span>
                    </div>
                    
                    {enterpriseAnalytics.rawData?.teamUsages?.rows ? (
                      <div className="space-y-3">
                        {/* Process and display team data from API */}
                        {(() => {
                          // Debug: log the raw data
                          console.log('Team adoption raw data:', enterpriseAnalytics.rawData?.teamUsages);
                          console.log('Raw team rows:', enterpriseAnalytics.rawData.teamUsages.rows);
                          
                          // Group team data by team name and calculate totals
                          const teamData: Record<string, { insertions: number; detachments: number }> = enterpriseAnalytics.rawData.teamUsages.rows
                            .filter((row: any) => {
                              console.log('Processing team row:', row);
                              return row.team_name && !row.team_name.includes('not visible') && !row.team_name.includes('<Drafts>');
                            })
                            .reduce((acc: Record<string, { insertions: number; detachments: number }>, row: any) => {
                              // Keep original team name to match Figma native display
                              const teamName = row.team_name;
                              console.log(`Team: ${teamName}, Usages: ${row.usages}, File: ${row.file_name}`);
                              if (!acc[teamName]) {
                                acc[teamName] = { insertions: 0, detachments: 0 };
                              }
                              // Use usages as insertions since teamUsages API doesn't have insertions/detachments breakdown
                              acc[teamName].insertions += row.usages || 0;
                              acc[teamName].detachments += 0; // teamUsages doesn't track detachments
                              console.log(`Running total for ${teamName}: ${acc[teamName].insertions}`);
                              return acc;
                            }, {});
                          
                          console.log('Final processed team data:', teamData);
                          
                          // Sort teams by total insertions and take top 6
                          const sortedTeams = Object.entries(teamData)
                            .map(([name, data]) => ({ name, insertions: data.insertions, detachments: data.detachments }))
                            .sort((a, b) => b.insertions - a.insertions)
                            .slice(0, 6);
                          
                          // Calculate total team insertions for percentage calculation
                          const totalTeamInsertions = sortedTeams.reduce((sum, team) => sum + team.insertions, 0);
                          console.log('Total team insertions:', totalTeamInsertions);
                          console.log('Enterprise total insertions:', enterpriseAnalytics.totalInsertions);
                          
                          return sortedTeams.map((team, index) => {
                            const adoptionRate = totalTeamInsertions > 0 ? Math.round((team.insertions / totalTeamInsertions) * 100) : 0;
                            const percentage = adoptionRate; // Use the same percentage for both display and bar width
                            
                            return (
                              <div key={team.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-sm font-medium text-gray-600 w-4">{index + 1}.</span>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">{team.name}</span>
                                      <div className="flex items-center gap-4 text-xs text-gray-600">
                                        <span>{team.insertions} inserts</span>
                                        <span>{adoptionRate}%</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                        
                        {/* Summary footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">{enterpriseAnalytics.activeTeams} active teams</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{enterpriseAnalytics.adoptionRate}% adoption rate</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-sm">Team adoption data loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Component Inventory Table */}
            <div className="card-enhanced overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Component Inventory</h3>
                  {isEnterpriseMode && componentData.length > 0 && (
                    <button
                      onClick={() => setIsInventoryCollapsed(!isInventoryCollapsed)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {isInventoryCollapsed ? (
                        <>
                          <ChevronRight className="h-4 w-4" />
                          Expand
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Collapse
                        </>
                      )}
                    </button>
                  )}
                </div>
                {componentData.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-left">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">Health Score Calculation</p>
                        <p>Health scores are based on component documentation quality, naming conventions, and maintenance status. Components start at 100% and lose points for missing descriptions (-15%), deprecated status (-50%), or poor documentation. Well-documented library components receive bonus points (+10%).</p>
                        <p className="mt-2 text-gray-600">
                          <strong>Enterprise Version:</strong> Includes cross-file usage analytics, team adoption metrics, and historical trends for more accurate health assessment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {componentData.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Components Analyzed Yet</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Enter your Figma Personal Access Token and File Key above, then click "Analyze Component Inventory" to get started with your component health analysis.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">What you'll get:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Component inventory with thumbnails</li>
                        <li>• Health scores and quality metrics</li>
                        <li>• Documentation coverage analysis</li>
                        <li>• Deprecated component identification</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Requirements:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Figma Personal Access Token</li>
                        <li>• File Key from Figma URL</li>
                        <li>• Read access to the file</li>
                        <li>• Internet connection</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : !isInventoryCollapsed ? (
                <div className="overflow-x-auto">
                  <table className="table-enhanced">
                  <thead>
                    <tr>
                      <th className="w-8">Preview</th>
                      <th className="w-48">Component Name</th>
                      <th className="w-20">Variants</th>
                      <th className="w-24">Health Score</th>
                      <th className="w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupComponents(componentData)).map(([groupName, group]) => (
                      <>
                        {/* Base component row */}
                        <tr key={groupName} className="bg-gray-50">
                          <td className="w-8">
                            {group.base.thumbnail_url ? (
                              <img 
                                src={group.base.thumbnail_url} 
                                alt={group.base.name}
                                className="w-6 h-6 object-cover rounded border border-gray-200 bg-white"
                                onLoad={() => console.log(`Thumbnail loaded for ${group.base.name}:`, group.base.thumbnail_url)}
                                onError={(e) => {
                                  console.log(`Thumbnail failed for ${group.base.name}:`, group.base.thumbnail_url);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="font-medium">
                            <div className="flex items-center gap-2">
                              {group.variants.length > 0 && (
                                <button
                                  onClick={() => toggleGroup(groupName)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {expandedGroups.has(groupName) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              <div>
                                <div className="text-gray-900 truncate max-w-48" title={group.base.name}>
                                  {group.base.name}
                                </div>
                                {group.base.pageName && (
                                  <div className="text-xs text-gray-400 mt-1">Page: {group.base.pageName}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            {group.variants.length > 0 ? (
                              <span className="text-sm text-gray-600">
                                {group.variants.length}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (group.base.healthScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                              (group.base.healthScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {group.base.healthScore || 0}%
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              group.base.isDeprecated ? 'bg-orange-100 text-orange-800' :
                              group.base.isOrphaned ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                            }`}>
                              {group.base.isDeprecated ? 'Deprecated' : group.base.isOrphaned ? 'Library Component' : 'Active'}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Variant rows (expandable) */}
                        {expandedGroups.has(groupName) && group.variants.map((variant: any, variantIndex: number) => (
                          <tr key={`${groupName}-${variantIndex}`} className="bg-white">
                            <td className="w-8">
                              {variant.thumbnail_url ? (
                                <img 
                                  src={variant.thumbnail_url} 
                                  alt={variant.name}
                                  className="w-6 h-6 object-cover rounded border border-gray-200 bg-white"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="font-medium pl-8">
                              <div className="text-gray-700 text-sm truncate max-w-48" title={variant.name}>↳ {variant.name}</div>
                            </td>
                            <td className="text-center">
                              <span className="text-sm text-gray-400">-</span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                (variant.healthScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                (variant.healthScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {variant.healthScore || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                variant.isDeprecated ? 'bg-orange-100 text-orange-800' :
                                variant.isOrphaned ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                              }`}>
                                {variant.isDeprecated ? 'Deprecated' : variant.isOrphaned ? 'Library Component' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-sm">Component inventory collapsed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Top 10 Most Used Components */}
            {topComponents.length > 0 && (
              <div className="card-enhanced p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Most Used Components</h3>
                <div className="space-y-3">
                  {topComponents.map((component, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white text-xs font-medium rounded-full">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{component.name}</span>
                      </div>
                      <span className="text-sm font-medium text-primary-600">{component.usageCount} uses</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Empty State Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card-enhanced p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Components</p>
                    <p className="text-2xl font-bold text-gray-300">--</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Layers className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="card-enhanced p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Well-Documented</p>
                    <p className="text-2xl font-bold text-gray-300">--</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileCheckIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="card-enhanced p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Deprecated Components</p>
                    <p className="text-2xl font-bold text-gray-300">--</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </div>
              
              <div className="card-enhanced p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recent Updates</p>
                    <p className="text-2xl font-bold text-gray-300">--</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Export Button - Disabled */}
            <div className="flex justify-end mb-6">
              <button disabled className="btn-secondary-enhanced opacity-50 cursor-not-allowed">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {/* Empty State Component Table */}
            <div className="card-enhanced overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Component Inventory</h3>
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-left">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Health Score Calculation</p>
                      <p>Health scores are based on component documentation quality, naming conventions, and maintenance status. Components start at 100% and lose points for missing descriptions (-15%), deprecated status (-50%), or poor documentation. Well-documented library components receive bonus points (+10%).</p>
                      <p className="mt-2 text-gray-600">
                        <strong>Enterprise Version:</strong> Includes cross-file usage analytics, team adoption metrics, and historical trends for more accurate health assessment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table-enhanced">
                  <thead>
                    <tr>
                      <th className="w-8">Preview</th>
                      <th className="text-left">Component Name</th>
                      <th className="text-center">Variants</th>
                      <th>Health Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty state rows */}
                    {[1, 2, 3].map((index) => (
                      <tr key={index} className="bg-gray-50">
                        <td className="w-8">
                          <div className="w-6 h-6 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-gray-400" />
                          </div>
                        </td>
                        <td className="font-medium">
                          <div className="text-gray-400 text-sm">Component {index}</div>
                        </td>
                        <td className="text-center">
                          <span className="text-sm text-gray-400">--</span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            --%
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            --
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
