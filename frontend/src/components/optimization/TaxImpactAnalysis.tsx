import React, { useState } from 'react';
import { Calculator, DollarSign, AlertTriangle, CheckCircle, Info, TrendingDown } from 'lucide-react';

interface TaxLot {
  symbol: string;
  purchaseDate: Date;
  quantity: number;
  costBasis: number;
  currentValue: number;
  unrealizedGainLoss: number;
  holdingPeriod: number; // in days
  isLongTerm: boolean;
}

interface TaxHarvestingOpportunity {
  symbol: string;
  currentLoss: number;
  taxSavings: number;
  replacementSuggestions: string[];
  washSaleRisk: boolean;
  washSaleEndDate?: Date;
}

interface RebalancingTaxImpact {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  estimatedGainLoss: number;
  taxImpact: number;
  isLongTermGain: boolean;
  recommendedTiming?: string;
}

interface TaxImpactData {
  currentTaxBracket: number;
  longTermCapitalGainsTax: number;
  shortTermCapitalGainsTax: number;
  totalUnrealizedGains: number;
  totalUnrealizedLosses: number;
  totalTaxLiability: number;
  potentialTaxSavings: number;
  taxLots: TaxLot[];
  harvestingOpportunities: TaxHarvestingOpportunity[];
  rebalancingImpacts: RebalancingTaxImpact[];
  analysis: {
    recommendedStrategy: string;
    priorityActions: string[];
    washSaleWarnings: number;
    optimalHarvestingAmount: number;
    yearEndStrategy: string;
  };
}

interface TaxImpactAnalysisProps {
  data: TaxImpactData;
  title?: string;
  onOptimizeTaxes?: () => Promise<void>;
  onExecuteHarvesting?: (opportunities: string[]) => Promise<void>;
  isOptimizing?: boolean;
  className?: string;
}

const TaxImpactAnalysis: React.FC<TaxImpactAnalysisProps> = ({
  data,
  title = 'Tax Impact Analysis',
  onOptimizeTaxes,
  onExecuteHarvesting,
  isOptimizing = false,
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'lots' | 'harvesting' | 'rebalancing'>('overview');
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [taxScenario, setTaxScenario] = useState({
    bracket: data.currentTaxBracket,
    longTermRate: data.longTermCapitalGainsTax,
    shortTermRate: data.shortTermCapitalGainsTax
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Get tax color
  const getTaxColor = (amount: number) => {
    if (amount < 0) return 'text-green-600'; // Tax savings
    if (amount > 0) return 'text-red-600';   // Tax liability
    return 'text-gray-600';
  };

  // Get holding period color
  const getHoldingPeriodColor = (days: number) => {
    if (days >= 365) return 'text-green-600'; // Long-term
    if (days >= 300) return 'text-yellow-600'; // Close to long-term
    return 'text-red-600'; // Short-term
  };

  // Toggle opportunity selection
  const toggleOpportunity = (symbol: string) => {
    setSelectedOpportunities(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  // Calculate total selected tax savings
  const selectedTaxSavings = data.harvestingOpportunities
    .filter(opp => selectedOpportunities.includes(opp.symbol))
    .reduce((sum, opp) => sum + opp.taxSavings, 0);

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {onOptimizeTaxes && (
              <button
                onClick={onOptimizeTaxes}
                disabled={isOptimizing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOptimizing ? (
                  <>
                    <Calculator className="h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    Optimize Taxes
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tax Scenario Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Bracket
              </label>
              <select
                value={taxScenario.bracket}
                onChange={(e) => setTaxScenario(prev => ({
                  ...prev,
                  bracket: parseFloat(e.target.value)
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0.10}>10%</option>
                <option value={0.12}>12%</option>
                <option value={0.22}>22%</option>
                <option value={0.24}>24%</option>
                <option value={0.32}>32%</option>
                <option value={0.35}>35%</option>
                <option value={0.37}>37%</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Long-Term Rate
              </label>
              <select
                value={taxScenario.longTermRate}
                onChange={(e) => setTaxScenario(prev => ({
                  ...prev,
                  longTermRate: parseFloat(e.target.value)
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0.0}>0%</option>
                <option value={0.15}>15%</option>
                <option value={0.20}>20%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short-Term Rate
              </label>
              <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md text-gray-600">
                {formatPercentage(taxScenario.bracket)}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs font-medium mb-1">Tax Liability</div>
            <div className="text-xl font-bold text-red-900">
              {formatCurrency(data.totalTaxLiability)}
            </div>
            <div className="text-xs text-red-700">If realized today</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs font-medium mb-1">Potential Savings</div>
            <div className="text-xl font-bold text-green-900">
              {formatCurrency(data.potentialTaxSavings)}
            </div>
            <div className="text-xs text-green-700">Through harvesting</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs font-medium mb-1">Unrealized Gains</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(data.totalUnrealizedGains)}
            </div>
            <div className="text-xs text-blue-700">Current portfolio</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs font-medium mb-1">Unrealized Losses</div>
            <div className="text-xl font-bold text-purple-900">
              {formatCurrency(Math.abs(data.totalUnrealizedLosses))}
            </div>
            <div className="text-xs text-purple-700">Harvesting opportunity</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'lots', label: 'Tax Lots', icon: DollarSign },
            { id: 'harvesting', label: 'Tax Harvesting', icon: TrendingDown },
            { id: 'rebalancing', label: 'Rebalancing Impact', icon: Calculator }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Strategy Recommendation */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Recommended Strategy</h4>
              <p className="text-blue-800 mb-3">{data.analysis.recommendedStrategy}</p>
              <div className="space-y-2">
                <h5 className="font-medium text-blue-900">Priority Actions:</h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  {data.analysis.priorityActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Year-End Strategy */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Year-End Planning</h4>
              <p className="text-yellow-800">{data.analysis.yearEndStrategy}</p>
              <div className="mt-3 text-sm text-yellow-700">
                <strong>Optimal Harvesting Amount:</strong> {formatCurrency(data.analysis.optimalHarvestingAmount)}
              </div>
            </div>

            {/* Warnings */}
            {data.analysis.washSaleWarnings > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">Wash Sale Warnings</h4>
                </div>
                <p className="text-red-800">
                  {data.analysis.washSaleWarnings} positions have potential wash sale risks. 
                  Review the Tax Harvesting tab for details.
                </p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'lots' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">Tax Lot Analysis</h4>
              <div className="text-sm text-gray-500">
                {data.taxLots.length} tax lots
              </div>
            </div>
            
            <div className="space-y-3">
              {data.taxLots.map((lot, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{lot.symbol}</h5>
                      <div className="text-sm text-gray-600">
                        Purchased: {formatDate(lot.purchaseDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${getTaxColor(lot.unrealizedGainLoss)}`}>
                        {lot.unrealizedGainLoss >= 0 ? '+' : ''}
                        {formatCurrency(lot.unrealizedGainLoss)}
                      </div>
                      <div className={`text-sm ${getHoldingPeriodColor(lot.holdingPeriod)}`}>
                        {lot.isLongTerm ? 'Long-term' : 'Short-term'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <div className="font-medium">{lot.quantity.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost Basis:</span>
                      <div className="font-medium">{formatCurrency(lot.costBasis)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Value:</span>
                      <div className="font-medium">{formatCurrency(lot.currentValue)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Holding Period:</span>
                      <div className="font-medium">{lot.holdingPeriod} days</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'harvesting' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">Tax Loss Harvesting Opportunities</h4>
              {selectedOpportunities.length > 0 && onExecuteHarvesting && (
                <button
                  onClick={() => onExecuteHarvesting(selectedOpportunities)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Execute Selected ({formatCurrency(selectedTaxSavings)} savings)
                </button>
              )}
            </div>

            <div className="space-y-3">
              {data.harvestingOpportunities.map((opportunity, index) => (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedOpportunities.includes(opportunity.symbol)
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleOpportunity(opportunity.symbol)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOpportunities.includes(opportunity.symbol)}
                        onChange={() => toggleOpportunity(opportunity.symbol)}
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                      />
                      <div>
                        <h5 className="font-semibold text-gray-900">{opportunity.symbol}</h5>
                        {opportunity.washSaleRisk && (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            Wash sale risk until {opportunity.washSaleEndDate && formatDate(opportunity.washSaleEndDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(opportunity.currentLoss)}
                      </div>
                      <div className="text-sm text-green-600">
                        Save {formatCurrency(opportunity.taxSavings)}
                      </div>
                    </div>
                  </div>
                  
                  {opportunity.replacementSuggestions.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <h6 className="text-sm font-medium text-blue-900 mb-2">Replacement Suggestions:</h6>
                      <div className="flex flex-wrap gap-2">
                        {opportunity.replacementSuggestions.map((replacement, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {replacement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {data.harvestingOpportunities.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No tax loss harvesting opportunities available</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'rebalancing' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Rebalancing Tax Impact</h4>
            
            <div className="space-y-3">
              {data.rebalancingImpacts.map((impact, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{impact.symbol}</h5>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          impact.action === 'buy' 
                            ? 'text-green-700 bg-green-100'
                            : 'text-red-700 bg-red-100'
                        }`}>
                          {impact.action.toUpperCase()}
                        </span>
                        <span className="text-gray-600">
                          {impact.quantity.toLocaleString()} shares
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${getTaxColor(impact.taxImpact)}`}>
                        {impact.taxImpact >= 0 ? '+' : ''}
                        {formatCurrency(impact.taxImpact)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {impact.isLongTermGain ? 'Long-term' : 'Short-term'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Estimated Gain/Loss:</span>
                      <div className={`font-medium ${getTaxColor(impact.estimatedGainLoss)}`}>
                        {impact.estimatedGainLoss >= 0 ? '+' : ''}
                        {formatCurrency(impact.estimatedGainLoss)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Tax Rate:</span>
                      <div className="font-medium">
                        {formatPercentage(impact.isLongTermGain ? taxScenario.longTermRate : taxScenario.bracket)}
                      </div>
                    </div>
                  </div>
                  
                  {impact.recommendedTiming && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <strong>Timing Recommendation:</strong> {impact.recommendedTiming}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {data.rebalancingImpacts.length === 0 && (
              <div className="text-center py-8">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No rebalancing tax impacts to display</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxImpactAnalysis;
