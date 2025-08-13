import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';
import { portfolioService } from './portfolio.service';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestGain: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalTrades: number;
}

export interface BenchmarkComparison {
  benchmarkReturn: number;
  benchmarkReturnPercent: number;
  alpha: number;
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

export interface PerformancePeriod {
  period: string;
  startDate: Date;
  endDate: Date;
  metrics: PerformanceMetrics;
  benchmark: BenchmarkComparison;
  attribution: PerformanceAttribution[];
}

export interface PerformanceAttribution {
  symbol: string;
  sector: string;
  positionReturn: number;
  contribution: number;
  weight: number;
}

export interface PerformanceTimeSeries {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
  drawdown: number;
}

export interface PerformanceReport {
  userId: string;
  periods: PerformancePeriod[];
  timeSeries: PerformanceTimeSeries[];
  correlationMatrix: Record<string, Record<string, number>>;
  monthlyReturns: MonthlyReturn[];
  riskMetrics: RiskMetrics;
  generatedAt: Date;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  benchmark: number;
}

export interface RiskMetrics {
  var95: number; // Value at Risk (95% confidence)
  var99: number; // Value at Risk (99% confidence)
  expectedShortfall: number;
  calmarRatio: number;
  omega: number;
  gainToPainRatio: number;
}

export type PerformancePeriodType = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

interface PortfolioValue {
  date: Date;
  value: number;
}

interface BenchmarkDataPoint {
  date: Date;
  price: number;
  dailyReturn: number;
}

class PerformanceAnalyticsService {

  /**
   * Get comprehensive performance analytics for multiple periods
   */
  async getPerformanceAnalytics(
    userId: string, 
    periods: PerformancePeriodType[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'],
    benchmark: string = 'SPY'
  ): Promise<PerformanceReport> {
    try {
      // Calculate date ranges for each period
      const periodRanges = periods.map(period => ({
        period,
        ...this.calculatePeriodRange(period)
      }));

      // Get or calculate performance data for each period
      const performancePeriods: PerformancePeriod[] = [];
      
      for (const range of periodRanges) {
        const performanceData = await this.calculatePeriodPerformance(
          userId, 
          range.period, 
          range.startDate, 
          range.endDate, 
          benchmark
        );
        performancePeriods.push(performanceData);
      }

      // Get detailed time series for charts
      const timeSeries = await this.getPerformanceTimeSeries(userId, benchmark);

      // Calculate correlation matrix
      const correlationMatrix = await this.calculateCorrelationMatrix(userId);

      // Generate monthly returns breakdown
      const monthlyReturns = await this.getMonthlyReturns(userId, benchmark);

      // Calculate advanced risk metrics
      const riskMetrics = await this.calculateRiskMetrics(userId);

      const report: PerformanceReport = {
        userId,
        periods: performancePeriods,
        timeSeries,
        correlationMatrix,
        monthlyReturns,
        riskMetrics,
        generatedAt: new Date()
      };

      // Log analytics access
      await AuditService.log({
        userId,
        eventType: 'performance',
        eventAction: 'ANALYTICS_GENERATED',
        eventData: {
          periods: periods.join(','),
          benchmark,
          timestamp: new Date().toISOString()
        }
      });

      return report;

    } catch (error) {
      console.error('Error generating performance analytics:', error);
      throw new Error('Failed to generate performance analytics');
    }
  }

  /**
   * Calculate performance metrics for a specific period
   */
  async calculatePeriodPerformance(
    userId: string,
    period: string,
    startDate: Date,
    endDate: Date,
    benchmark: string = 'SPY'
  ): Promise<PerformancePeriod> {
    try {
      // Get portfolio values for the period
      const portfolioValues = await this.getPortfolioValueHistory(userId, startDate, endDate);
      
      if (portfolioValues.length < 2) {
        // Return default metrics if insufficient data
        return {
          period,
          startDate,
          endDate,
          metrics: this.getDefaultMetrics(),
          benchmark: this.getDefaultBenchmark(),
          attribution: []
        };
      }

      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(portfolioValues);

      // Get benchmark data and calculate comparison
      const benchmarkData = await this.getBenchmarkData(benchmark, startDate, endDate);
      const benchmarkComparison = this.calculateBenchmarkComparison(portfolioValues, benchmarkData);

      // Calculate performance attribution
      const attribution = await this.calculatePerformanceAttribution(userId, startDate, endDate);

      return {
        period,
        startDate,
        endDate,
        metrics,
        benchmark: benchmarkComparison,
        attribution
      };

    } catch (error) {
      console.error(`Error calculating performance for period ${period}:`, error);
      return {
        period,
        startDate,
        endDate,
        metrics: this.getDefaultMetrics(),
        benchmark: this.getDefaultBenchmark(),
        attribution: []
      };
    }
  }

  /**
   * Get performance time series for charts
   */
  async getPerformanceTimeSeries(
    userId: string,
    benchmark: string = 'SPY',
    days: number = 365
  ): Promise<PerformanceTimeSeries[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Generate mock performance data for demo
      const timeSeries: PerformanceTimeSeries[] = [];
      let portfolioValue = 10000;
      let cumulativeReturn = 0;

      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        
        // Simulate daily returns
        const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily
        portfolioValue *= (1 + dailyReturn);
        cumulativeReturn = (portfolioValue / 10000) - 1;

        const benchmarkReturn = (Math.random() - 0.5) * 0.03; // ±1.5% daily
        const drawdown = Math.max(0, (Math.random() - 0.8) * 0.1); // Occasional drawdowns

        timeSeries.push({
          date,
          portfolioValue,
          dailyReturn: dailyReturn * 100,
          cumulativeReturn: cumulativeReturn * 100,
          benchmarkReturn: benchmarkReturn * 100,
          drawdown: drawdown * 100
        });
      }

      return timeSeries;

    } catch (error) {
      console.error('Error getting performance time series:', error);
      return [];
    }
  }

  /**
   * Calculate correlation matrix for portfolio positions
   */
  async calculateCorrelationMatrix(userId: string): Promise<Record<string, Record<string, number>>> {
    try {
      // Get portfolio positions
      const positions = await prisma.portfolioPosition.findMany({
        where: { userId },
        select: { symbol: true }
      });

      const symbols = positions.map(p => p.symbol);
      const correlationMatrix: Record<string, Record<string, number>> = {};

      // Generate mock correlation data
      for (let i = 0; i < symbols.length; i++) {
        const symbol1 = symbols[i];
        if (symbol1) {
          correlationMatrix[symbol1] = {};
          
          for (let j = 0; j < symbols.length; j++) {
            const symbol2 = symbols[j];
            if (symbol2) {
              if (i === j) {
                correlationMatrix[symbol1][symbol2] = 1.0;
              } else {
                // Mock correlation between -0.5 and 0.8
                correlationMatrix[symbol1][symbol2] = Math.random() * 1.3 - 0.5;
              }
            }
          }
        }
      }

      return correlationMatrix;

    } catch (error) {
      console.error('Error calculating correlation matrix:', error);
      return {};
    }
  }

  /**
   * Get monthly returns breakdown
   */
  async getMonthlyReturns(userId: string, benchmark: string = 'SPY'): Promise<MonthlyReturn[]> {
    try {
      const monthlyReturns: MonthlyReturn[] = [];
      const currentDate = new Date();
      const startYear = currentDate.getFullYear() - 1; // 1 year back

      // Generate mock monthly returns
      for (let year = startYear; year <= currentDate.getFullYear(); year++) {
        const maxMonth = year === currentDate.getFullYear() ? currentDate.getMonth() + 1 : 12;
        
        for (let month = 1; month <= maxMonth; month++) {
          const portfolioReturn = (Math.random() - 0.5) * 20; // ±10% monthly
          const benchmarkReturn = (Math.random() - 0.5) * 15; // ±7.5% monthly

          monthlyReturns.push({
            year,
            month,
            return: portfolioReturn,
            benchmark: benchmarkReturn
          });
        }
      }

      return monthlyReturns;

    } catch (error) {
      console.error('Error getting monthly returns:', error);
      return [];
    }
  }

  /**
   * Calculate advanced risk metrics
   */
  async calculateRiskMetrics(userId: string): Promise<RiskMetrics> {
    try {
      // Generate mock risk metrics for demo
      return {
        var95: Math.random() * 5 + 1, // 1-6%
        var99: Math.random() * 8 + 2, // 2-10%
        expectedShortfall: Math.random() * 6 + 2, // 2-8%
        calmarRatio: Math.random() * 2 + 0.5, // 0.5-2.5
        omega: Math.random() * 1.5 + 1, // 1-2.5
        gainToPainRatio: Math.random() * 2 + 1 // 1-3
      };

    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      return {
        var95: 0,
        var99: 0,
        expectedShortfall: 0,
        calmarRatio: 0,
        omega: 0,
        gainToPainRatio: 0
      };
    }
  }

  /**
   * Export performance data to CSV
   */
  async exportPerformanceCSV(userId: string, period: PerformancePeriodType = 'ALL'): Promise<string> {
    try {
      const timeSeries = await this.getPerformanceTimeSeries(userId, 'SPY', 365);

      // CSV Headers
      const headers = [
        'Date',
        'Portfolio Value',
        'Daily Return %',
        'Cumulative Return %',
        'Benchmark Return %',
        'Drawdown %'
      ];

      // CSV Rows
      const rows = timeSeries.map(data => [
        data.date.toISOString().split('T')[0],
        data.portfolioValue.toFixed(2),
        data.dailyReturn.toFixed(4),
        data.cumulativeReturn.toFixed(4),
        data.benchmarkReturn.toFixed(4),
        data.drawdown.toFixed(4)
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

      // Log export
      await AuditService.log({
        userId,
        eventType: 'performance',
        eventAction: 'CSV_EXPORTED',
        eventData: {
          period,
          recordCount: timeSeries.length,
          timestamp: new Date().toISOString()
        }
      });

      return csvContent;

    } catch (error) {
      console.error('Error exporting performance CSV:', error);
      throw new Error('Failed to export performance data');
    }
  }

  // Private helper methods

  private calculatePeriodRange(period: PerformancePeriodType): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate: Date;

    switch (period) {
      case '1D':
        startDate = new Date(endDate.getTime() - (1 * 24 * 60 * 60 * 1000));
        break;
      case '1W':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '1M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        break;
      case '3M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate());
        break;
      case '6M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, endDate.getDate());
        break;
      case '1Y':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
      case 'YTD':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case 'ALL':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
    }

    return { startDate, endDate };
  }

  private async getPortfolioValueHistory(userId: string, startDate: Date, endDate: Date): Promise<PortfolioValue[]> {
    try {
      // Get portfolio summary to determine current value
      const summary = await portfolioService.getPortfolioSummary(userId, false);
      const currentValue = summary.totalValue;

      // Generate historical values (simplified for demo)
      const values: PortfolioValue[] = [];
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      let portfolioValue = currentValue * 0.9; // Start 10% lower

      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        
        // Simulate growth with some volatility
        const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily
        portfolioValue *= (1 + dailyReturn);

        values.push({ date, value: portfolioValue });
      }

      return values;

    } catch (error) {
      console.error('Error getting portfolio value history:', error);
      return [];
    }
  }

  private async getBenchmarkData(symbol: string, startDate: Date, endDate: Date): Promise<BenchmarkDataPoint[]> {
    try {
      // Generate mock benchmark data
      const data: BenchmarkDataPoint[] = [];
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      let price = 400; // Mock SPY price

      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        const dailyReturn = (Math.random() - 0.5) * 0.03; // ±1.5% daily
        
        price *= (1 + dailyReturn);

        data.push({
          date,
          price,
          dailyReturn: dailyReturn * 100
        });
      }

      return data;

    } catch (error) {
      console.error('Error getting benchmark data:', error);
      return [];
    }
  }

  private calculatePerformanceMetrics(portfolioValues: PortfolioValue[]): PerformanceMetrics {
    const returns = this.calculateReturns(portfolioValues);
    const positiveReturns = returns.filter(r => r > 0);
    const negativeReturns = returns.filter(r => r < 0);

    // Total return
    const startValue = portfolioValues[0]?.value || 0;
    const endValue = portfolioValues[portfolioValues.length - 1]?.value || 0;
    const totalReturn = endValue - startValue;
    const totalReturnPercent = startValue > 0 ? (totalReturn / startValue) * 100 : 0;

    // Annualized return
    const startDate = portfolioValues[0]?.date;
    const endDate = portfolioValues[portfolioValues.length - 1]?.date;
    const days = startDate && endDate ? this.daysBetween(startDate, endDate) : 0;
    const annualizedReturn = days > 0 && startValue > 0 ? (Math.pow(endValue / startValue, 365 / days) - 1) * 100 : 0;

    // Volatility (annualized standard deviation)
    const volatility = this.calculateVolatility(returns) * Math.sqrt(252) * 100;

    // Sharpe Ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 2;
    const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;

    // Sortino Ratio (downside deviation)
    const downsideVolatility = this.calculateVolatility(negativeReturns) * Math.sqrt(252) * 100;
    const sortinoRatio = downsideVolatility > 0 ? (annualizedReturn - riskFreeRate) / downsideVolatility : 0;

    // Maximum Drawdown
    const maxDrawdown = this.calculateMaxDrawdown(portfolioValues) * 100;

    // Win/Loss Statistics
    const winRate = returns.length > 0 ? (positiveReturns.length / returns.length) * 100 : 0;
    const avgWin = positiveReturns.length > 0 ? (positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length) * 100 : 0;
    const avgLoss = negativeReturns.length > 0 ? (negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length) * 100 : 0;
    const largestGain = returns.length > 0 ? Math.max(...returns, 0) * 100 : 0;
    const largestLoss = returns.length > 0 ? Math.min(...returns, 0) * 100 : 0;

    // Consecutive wins/losses
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveWinsLosses(returns);

    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      avgWin,
      avgLoss,
      largestGain,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
      totalTrades: returns.length
    };
  }

  private calculateBenchmarkComparison(
    portfolioValues: PortfolioValue[],
    benchmarkData: BenchmarkDataPoint[]
  ): BenchmarkComparison {
    try {
      if (benchmarkData.length < 2 || portfolioValues.length < 2) {
        return this.getDefaultBenchmark();
      }

      // Calculate benchmark return
      const benchmarkStart = benchmarkData[0]?.price || 0;
      const benchmarkEnd = benchmarkData[benchmarkData.length - 1]?.price || 0;
      const benchmarkReturn = benchmarkEnd - benchmarkStart;
      const benchmarkReturnPercent = benchmarkStart > 0 ? (benchmarkReturn / benchmarkStart) * 100 : 0;

      // Calculate portfolio return
      const portfolioStart = portfolioValues[0]?.value || 0;
      const portfolioEnd = portfolioValues[portfolioValues.length - 1]?.value || 0;
      const portfolioReturnPercent = portfolioStart > 0 ? ((portfolioEnd / portfolioStart) - 1) * 100 : 0;

      // Mock other metrics for demo
      const beta = Math.random() * 0.5 + 0.8; // 0.8-1.3
      const alpha = portfolioReturnPercent - (beta * benchmarkReturnPercent);
      const correlation = Math.random() * 0.4 + 0.6; // 0.6-1.0
      const trackingError = Math.random() * 3 + 1; // 1-4%
      const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

      return {
        benchmarkReturn,
        benchmarkReturnPercent,
        alpha,
        beta,
        correlation,
        trackingError,
        informationRatio
      };

    } catch (error) {
      console.error('Error calculating benchmark comparison:', error);
      return this.getDefaultBenchmark();
    }
  }

  private async calculatePerformanceAttribution(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceAttribution[]> {
    try {
      // Get portfolio positions
      const positions = await prisma.portfolioPosition.findMany({
        where: { userId }
      });

      const attribution: PerformanceAttribution[] = [];

      for (const position of positions) {
        // Mock performance attribution for demo
        const positionReturn = (Math.random() - 0.5) * 30; // ±15%
        const weight = position.marketValue?.toNumber() || 0;
        const contribution = (positionReturn / 100) * weight;

        attribution.push({
          symbol: position.symbol,
          sector: position.sector || 'Unknown',
          positionReturn,
          contribution,
          weight
        });
      }

      return attribution.sort((a, b) => b.contribution - a.contribution);

    } catch (error) {
      console.error('Error calculating performance attribution:', error);
      return [];
    }
  }

  private calculateReturns(values: PortfolioValue[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i - 1]?.value || 0;
      const currValue = values[i]?.value || 0;
      
      if (prevValue > 0) {
        returns.push((currValue - prevValue) / prevValue);
      }
    }
    
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(values: PortfolioValue[]): number {
    if (values.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = values[0]?.value || 0;
    
    for (let i = 1; i < values.length; i++) {
      const currentValue = values[i]?.value || 0;
      
      if (currentValue > peak) {
        peak = currentValue;
      } else if (peak > 0) {
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  private calculateConsecutiveWinsLosses(returns: number[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const ret of returns) {
      if (ret > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else if (ret < 0) {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    }

    return {
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses
    };
  }

  private daysBetween(date1: Date, date2: Date): number {
    return Math.abs((date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000));
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      largestGain: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      totalTrades: 0
    };
  }

  private getDefaultBenchmark(): BenchmarkComparison {
    return {
      benchmarkReturn: 0,
      benchmarkReturnPercent: 0,
      alpha: 0,
      beta: 1,
      correlation: 0,
      trackingError: 0,
      informationRatio: 0
    };
  }
}

export const performanceAnalyticsService = new PerformanceAnalyticsService();
