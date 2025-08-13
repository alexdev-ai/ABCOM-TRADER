import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Explanation {
  id: string;
  title: string;
  concept: string;
  description: string;
  example?: string;
  benefits: string[];
  risks?: string[];
  whenToUse: string;
  formula?: string;
  relatedConcepts: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

interface OptimizationExplanationsProps {
  explanations: Explanation[];
  currentContext?: string;
  title?: string;
  className?: string;
}

const OptimizationExplanations: React.FC<OptimizationExplanationsProps> = ({
  explanations,
  currentContext,
  title = 'Portfolio Optimization Concepts',
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [filterComplexity, setFilterComplexity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Default explanations if none provided
  const defaultExplanations: Explanation[] = [
    {
      id: 'modern-portfolio-theory',
      title: 'Modern Portfolio Theory (MPT)',
      concept: 'Risk-Return Optimization',
      description: 'MPT is a mathematical framework for constructing portfolios that maximize expected return for a given level of risk, or minimize risk for a given level of expected return.',
      example: 'Instead of putting all money in one stock, MPT suggests combining assets that don\'t move together (low correlation) to reduce overall portfolio risk while maintaining returns.',
      benefits: [
        'Provides systematic approach to diversification',
        'Quantifies the risk-return tradeoff',
        'Helps identify optimal portfolio allocations',
        'Forms the foundation for modern portfolio management'
      ],
      risks: [
        'Assumes historical data predicts future performance',
        'Requires accurate estimates of returns, volatilities, and correlations',
        'May not account for extreme market events'
      ],
      whenToUse: 'Use MPT when you want to optimize portfolio allocation based on historical risk-return characteristics and have reliable data on asset correlations.',
      formula: 'Portfolio Variance = Σ(wi²σi²) + ΣΣ(wiwjσiσjρij)',
      relatedConcepts: ['efficient-frontier', 'sharpe-ratio', 'diversification'],
      complexity: 'intermediate'
    },
    {
      id: 'efficient-frontier',
      title: 'Efficient Frontier',
      concept: 'Optimal Portfolio Set',
      description: 'The efficient frontier represents the set of optimal portfolios offering the highest expected return for each level of risk, or the lowest risk for each level of expected return.',
      example: 'Think of it as a curve showing all the "best possible" portfolios. Any portfolio below this curve is suboptimal because you could get better returns for the same risk.',
      benefits: [
        'Visualizes the risk-return tradeoff',
        'Identifies optimal portfolio combinations',
        'Helps compare different investment strategies',
        'Shows the cost of conservative vs aggressive approaches'
      ],
      whenToUse: 'Use when comparing different portfolio allocations or when trying to find the optimal balance between risk and return for your investment goals.',
      relatedConcepts: ['modern-portfolio-theory', 'sharpe-ratio', 'capital-allocation-line'],
      complexity: 'intermediate'
    },
    {
      id: 'sharpe-ratio',
      title: 'Sharpe Ratio',
      concept: 'Risk-Adjusted Returns',
      description: 'The Sharpe ratio measures the excess return per unit of risk in an investment, helping compare the risk-adjusted performance of different portfolios.',
      example: 'If Portfolio A returns 10% with 15% volatility and Portfolio B returns 8% with 10% volatility, Portfolio B has a better Sharpe ratio (higher return per unit of risk).',
      benefits: [
        'Provides single metric for risk-adjusted performance',
        'Enables comparison across different investments',
        'Accounts for both return and risk',
        'Widely used industry standard'
      ],
      risks: [
        'Assumes normal distribution of returns',
        'May not capture tail risks',
        'Historical measure may not predict future performance'
      ],
      whenToUse: 'Use to compare the risk-adjusted performance of different portfolios or to identify the optimal portfolio on the efficient frontier.',
      formula: 'Sharpe Ratio = (Portfolio Return - Risk-free Rate) / Portfolio Standard Deviation',
      relatedConcepts: ['modern-portfolio-theory', 'efficient-frontier', 'risk-parity'],
      complexity: 'beginner'
    },
    {
      id: 'diversification',
      title: 'Diversification',
      concept: 'Risk Reduction Through Variety',
      description: 'Diversification is the practice of spreading investments across various assets, sectors, or geographic regions to reduce overall portfolio risk.',
      example: 'Instead of buying only tech stocks, diversify across tech, healthcare, finance, and international markets. When tech declines, other sectors might perform well.',
      benefits: [
        'Reduces portfolio volatility',
        'Protects against sector-specific risks',
        'Provides more consistent returns over time',
        'The only "free lunch" in investing'
      ],
      risks: [
        'May limit upside potential',
        'Doesn\'t eliminate systematic market risk',
        'Over-diversification can lead to mediocre returns'
      ],
      whenToUse: 'Always use diversification as a foundational principle. Particularly important for long-term investors and those with moderate risk tolerance.',
      relatedConcepts: ['correlation', 'asset-allocation', 'rebalancing'],
      complexity: 'beginner'
    },
    {
      id: 'rebalancing',
      title: 'Portfolio Rebalancing',
      concept: 'Maintaining Target Allocation',
      description: 'Rebalancing involves periodically adjusting portfolio weights back to target allocations as market movements cause the portfolio to drift from its intended composition.',
      example: 'If your target is 60% stocks/40% bonds, but stocks outperform and grow to 70%, rebalancing means selling some stocks and buying bonds to return to 60/40.',
      benefits: [
        'Maintains desired risk level',
        'Forces disciplined selling high and buying low',
        'Prevents portfolio drift',
        'Can enhance long-term returns through the rebalancing premium'
      ],
      risks: [
        'Transaction costs from frequent trading',
        'Tax implications from selling appreciated assets',
        'May miss out on momentum in outperforming assets'
      ],
      whenToUse: 'Rebalance when allocations drift significantly from targets (typically 5-10% threshold) or on a regular schedule (quarterly, annually).',
      relatedConcepts: ['asset-allocation', 'tax-loss-harvesting', 'portfolio-drift'],
      complexity: 'beginner'
    },
    {
      id: 'risk-parity',
      title: 'Risk Parity',
      concept: 'Equal Risk Contribution',
      description: 'Risk parity allocates capital so that each asset or asset class contributes equally to the portfolio\'s overall risk, rather than having equal dollar amounts.',
      example: 'Instead of investing 50% in stocks and 50% in bonds, risk parity might allocate 80% to bonds and 20% to stocks so each contributes equally to portfolio risk.',
      benefits: [
        'More balanced risk exposure',
        'Reduces concentration risk',
        'Can provide more consistent returns',
        'Less dependent on asset return forecasts'
      ],
      risks: [
        'May require leverage to achieve target returns',
        'Complex to implement and maintain',
        'Performance can lag in strong bull markets'
      ],
      whenToUse: 'Consider when you want more balanced risk exposure across asset classes or when you have low confidence in return forecasts.',
      relatedConcepts: ['risk-budgeting', 'volatility-targeting', 'equal-weight'],
      complexity: 'advanced'
    },
    {
      id: 'black-litterman',
      title: 'Black-Litterman Model',
      concept: 'Bayesian Portfolio Optimization',
      description: 'An enhancement to MPT that starts with market equilibrium assumptions and allows investors to incorporate their views about expected returns in a systematic way.',
      example: 'If you believe tech stocks will outperform by 2% over the next year, Black-Litterman incorporates this view while considering your confidence level and market equilibrium.',
      benefits: [
        'Addresses MPT\'s sensitivity to return estimates',
        'Provides more stable and intuitive allocations',
        'Incorporates investor views systematically',
        'Reduces extreme portfolio positions'
      ],
      risks: [
        'Complex to implement correctly',
        'Requires careful calibration of confidence levels',
        'Still dependent on quality of investor views'
      ],
      whenToUse: 'Use when you have specific views about certain assets but want to incorporate them systematically rather than making arbitrary adjustments.',
      relatedConcepts: ['modern-portfolio-theory', 'bayesian-inference', 'equilibrium-returns'],
      complexity: 'advanced'
    },
    {
      id: 'tax-loss-harvesting',
      title: 'Tax-Loss Harvesting',
      concept: 'Tax-Efficient Realization of Losses',
      description: 'The practice of selling securities at a loss to offset capital gains tax liability, while maintaining similar market exposure through replacement securities.',
      example: 'Sell a losing tech ETF to realize the loss for tax purposes, then buy a different but similar tech ETF to maintain exposure while avoiding wash sale rules.',
      benefits: [
        'Reduces current year tax liability',
        'Can carry forward unused losses',
        'Improves after-tax returns',
        'Maintains market exposure'
      ],
      risks: [
        'Wash sale rule violations',
        'Transaction costs',
        'Tracking error from replacement securities',
        'Complexity in implementation'
      ],
      whenToUse: 'Use when you have realized gains to offset or when building up a "bank" of tax losses for future use. Most effective in taxable accounts.',
      relatedConcepts: ['tax-efficiency', 'wash-sale-rule', 'asset-location'],
      complexity: 'intermediate'
    }
  ];

  const allExplanations = explanations.length > 0 ? explanations : defaultExplanations;

  // Filter explanations based on search and complexity
  const filteredExplanations = allExplanations.filter(exp => {
    const matchesSearch = searchTerm === '' || 
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesComplexity = filterComplexity === 'all' || exp.complexity === filterComplexity;
    
    return matchesSearch && matchesComplexity;
  });

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Get complexity color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get complexity icon
  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return <CheckCircle className="h-4 w-4" />;
      case 'intermediate': return <Info className="h-4 w-4" />;
      case 'advanced': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Level:</label>
            <select
              value={filterComplexity}
              onChange={(e) => setFilterComplexity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Current Context Highlight */}
        {currentContext && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Related to Current Analysis</h4>
            </div>
            <p className="text-blue-800 text-sm">
              The concepts below are particularly relevant to your current {currentContext} analysis.
            </p>
          </div>
        )}

        {/* Explanations List */}
        <div className="space-y-4">
          {filteredExplanations.map((explanation) => {
            const isExpanded = expandedItems.includes(explanation.id);
            const isContextRelevant = currentContext && 
              explanation.relatedConcepts.some(concept => 
                concept.toLowerCase().includes(currentContext.toLowerCase())
              );

            return (
              <div 
                key={explanation.id}
                className={`border rounded-lg transition-all duration-200 ${
                  isContextRelevant 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(explanation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{explanation.title}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getComplexityColor(explanation.complexity)}`}>
                          {getComplexityIcon(explanation.complexity)}
                          {explanation.complexity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{explanation.concept}</p>
                      <p className="text-sm text-gray-800">{explanation.description}</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Example */}
                        {explanation.example && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Example</h5>
                            <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded-md">
                              {explanation.example}
                            </p>
                          </div>
                        )}

                        {/* Benefits */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Benefits</h5>
                          <ul className="space-y-1">
                            {explanation.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Risks */}
                        {explanation.risks && explanation.risks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Risks & Limitations</h5>
                            <ul className="space-y-1">
                              {explanation.risks.map((risk, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* When to Use */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">When to Use</h5>
                          <p className="text-sm text-gray-700 p-3 bg-green-50 rounded-md">
                            {explanation.whenToUse}
                          </p>
                        </div>

                        {/* Formula */}
                        {explanation.formula && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Formula</h5>
                            <code className="block text-sm bg-gray-100 p-3 rounded-md font-mono">
                              {explanation.formula}
                            </code>
                          </div>
                        )}

                        {/* Related Concepts */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Related Concepts</h5>
                          <div className="flex flex-wrap gap-2">
                            {explanation.relatedConcepts.map((concept, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const relatedExp = allExplanations.find(exp => 
                                    exp.id === concept || exp.title.toLowerCase().includes(concept.replace('-', ' '))
                                  );
                                  if (relatedExp && !expandedItems.includes(relatedExp.id)) {
                                    toggleExpanded(relatedExp.id);
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {concept.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredExplanations.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No concepts found matching your search criteria.
            </p>
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredExplanations.length} of {allExplanations.length} concepts
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                <span>Beginner</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 rounded-full"></div>
                <span>Intermediate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                <span>Advanced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationExplanations;
