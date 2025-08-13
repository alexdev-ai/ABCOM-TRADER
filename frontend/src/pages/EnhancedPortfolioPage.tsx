import React, { useState, useEffect } from 'react';
import { portfolioApi, PortfolioPosition, PortfolioSummary, SectorAllocation } from '../services/portfolioApi';
import PortfolioSummaryCard from '../components/portfolio/PortfolioSummaryCard';
import PortfolioPositionCard from '../components/portfolio/PortfolioPositionCard';

const EnhancedPortfolioPage: React.FC = () => {
  // State management following our UX patterns
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [sectorAllocations, setSectorAllocations] = useState<SectorAllocation[]>([]);
  const [topGainers, setTopGainers] = useState<PortfolioPosition[]>([]);
  const [topLosers, setTopLosers] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View state for progressive disclosure
  const [activeView, setActiveView] = useState<'overview' | 'positions' | 'performance' | 'sectors'>('overview');
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all portfolio data in parallel
      const [summaryRes, positionsRes, sectorsRes, gainersRes, losersRes] = await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getPositions(),
        portfolioApi.getSectorAllocation(),
        portfolioApi.getTopGainers(3),
        portfolioApi.getTopLosers(3)
      ]);

      setSummary(summaryRes.data);
      setPositions(positionsRes.data);
      setSectorAllocations(sectorsRes.data);
      setTopGainers(gainersRes.data);
      setTopLosers(losersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Handle position card expansion
  const handleExpandPosition = (position: PortfolioPosition) => {
    setExpandedPosition(position.symbol);
  };

  // Emergency stop button (always visible - competitive analysis insight)
  const EmergencyStopButton = () => (
    <button className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg z-50 transition-all duration-200">
      <span className="text-2xl" role="img" aria-label="emergency stop">🛑</span>
    </button>
  );

  // Jobs-based navigation tabs
  const NavigationTabs = () => (
    <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Portfolio Navigation">
          {[
            { id: 'overview', label: 'Portfolio Overview', icon: '💼', job: 'What do I own?' },
            { id: 'positions', label: 'All Positions', icon: '📊', job: 'Detailed holdings' },
            { id: 'performance', label: 'Performance', icon: '📈', job: 'How am I doing?' },
            { id: 'sectors', label: 'Diversification', icon: '🥧', job: 'Am I diversified?' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors duration-200`}
            >
              <span className="mr-2" role="img" aria-label={tab.label}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="block sm:hidden">{tab.job}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  // Sector allocation visualization (simple pie chart alternative)
  const SectorAllocationView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        🥧 Portfolio Diversification
      </h3>
      <div className="grid gap-3">
        {sectorAllocations.map((sector, index) => (
          <div key={sector.sector} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{sector.sector}</span>
              <span className="text-sm font-semibold text-gray-600">
                {sector.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sector.percentage}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {formatCurrency(sector.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Performance overview with top gainers/losers
  const PerformanceView = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📈 Top Performers
        </h3>
        <div className="grid gap-3">
          {topGainers.map((position) => (
            <PortfolioPositionCard
              key={position.symbol}
              position={position}
              onExpandDetails={handleExpandPosition}
              isExpanded={expandedPosition === position.symbol}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📉 Underperformers
        </h3>
        <div className="grid gap-3">
          {topLosers.map((position) => (
            <PortfolioPositionCard
              key={position.symbol}
              position={position}
              onExpandDetails={handleExpandPosition}
              isExpanded={expandedPosition === position.symbol}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPortfolioData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation following jobs-based approach */}
      <NavigationTabs />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview View - Default landing */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Portfolio Summary - Prominent display */}
            {summary && (
              <PortfolioSummaryCard
                totalValue={summary.totalValue}
                dayChange={summary.dayChange}
                dayChangePercent={summary.dayChangePercent}
                cashBalance={summary.cashBalance}
                numberOfPositions={summary.numberOfPositions}
              />
            )}

            {/* Quick Performance Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📈 Today's Winners
                </h3>
                <div className="space-y-3">
                  {topGainers.slice(0, 2).map((position) => (
                    <div key={position.symbol} className="flex items-center justify-between">
                      <span className="font-medium">{position.symbol}</span>
                      <span className="text-green-600 font-semibold">
                        +{position.unrealizedPnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📉 Needs Attention
                </h3>
                <div className="space-y-3">
                  {topLosers.slice(0, 2).map((position) => (
                    <div key={position.symbol} className="flex items-center justify-between">
                      <span className="font-medium">{position.symbol}</span>
                      <span className="text-red-600 font-semibold">
                        {position.unrealizedPnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Positions View */}
        {activeView === 'positions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📊 All Your Positions
            </h2>
            <div className="grid gap-4">
              {positions.map((position) => (
                <PortfolioPositionCard
                  key={position.symbol}
                  position={position}
                  onExpandDetails={handleExpandPosition}
                  isExpanded={expandedPosition === position.symbol}
                />
              ))}
            </div>
          </div>
        )}

        {/* Performance View */}
        {activeView === 'performance' && <PerformanceView />}

        {/* Sectors View */}
        {activeView === 'sectors' && <SectorAllocationView />}
      </div>

      {/* Emergency Stop Button - Always visible (competitive analysis insight) */}
      <EmergencyStopButton />

      {/* Educational Footer */}
      <div className="bg-blue-50 border-t border-blue-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span className="text-lg" role="img" aria-label="lightbulb">💡</span>
            <span>
              New to investing? 
              <button className="ml-1 font-medium underline hover:no-underline">
                Learn what these numbers mean
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPortfolioPage;
