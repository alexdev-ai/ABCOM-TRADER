import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import WebSocket from 'ws';

const prisma = new PrismaClient();

// Market data interfaces
export interface MarketDataPoint {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
}

export interface TechnicalIndicatorData {
  symbol: string;
  timestamp: Date;
  rsi: number;
  macd: number;
  macdSignal: number;
  sma20: number;
  sma50: number;
  sma200: number;
  bollBandUpper: number;
  bollBandMiddle: number;
  bollBandLower: number;
  stoch: number;
  adx: number;
  williams: number;
}

export interface MarketConditionAnalysis {
  timestamp: Date;
  overallCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
  trendStrength: number;
  volatilityIndex: number;
  marketSentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface MarketDataSubscription {
  symbol: string;
  callback: (data: MarketDataPoint) => void;
  isActive: boolean;
}

export class MarketDataIngestionService {
  private static instance: MarketDataIngestionService;
  private subscriptions: Map<string, MarketDataSubscription> = new Map();
  private websocketConnections: Map<string, WebSocket> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;
  private marketHours = {
    preMarket: { start: 4, end: 9.5 }, // 4:00 AM - 9:30 AM ET
    regular: { start: 9.5, end: 16 }, // 9:30 AM - 4:00 PM ET
    afterHours: { start: 16, end: 20 } // 4:00 PM - 8:00 PM ET
  };

  // Cache for technical indicators and market conditions
  private technicalIndicatorsCache: Map<string, TechnicalIndicatorData> = new Map();
  private marketConditionCache: MarketConditionAnalysis | null = null;
  private priceCache: Map<string, MarketDataPoint> = new Map();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): MarketDataIngestionService {
    if (!MarketDataIngestionService.instance) {
      MarketDataIngestionService.instance = new MarketDataIngestionService();
    }
    return MarketDataIngestionService.instance;
  }

  /**
   * Initialize market data service
   */
  private async initialize(): Promise<void> {
    try {
      console.log('Initializing Market Data Ingestion Service...');

      // Initialize default market symbols
      const defaultSymbols = ['SPY', 'QQQ', 'IWM', 'VIX', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'];
      
      // Subscribe to market data for default symbols
      for (const symbol of defaultSymbols) {
        await this.subscribeToSymbol(symbol);
      }

      // Start market condition analysis
      this.startMarketConditionAnalysis();

      // Setup cleanup intervals
      this.setupCleanupIntervals();

      this.isInitialized = true;
      console.log('Market Data Ingestion Service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Market Data Ingestion Service:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time market data for a symbol
   */
  async subscribeToSymbol(symbol: string): Promise<void> {
    try {
      if (this.subscriptions.has(symbol)) {
        console.log(`Already subscribed to ${symbol}`);
        return;
      }

      console.log(`Subscribing to market data for ${symbol}`);

      // Create subscription with callback to handle data
      const subscription: MarketDataSubscription = {
        symbol,
        callback: (data: MarketDataPoint) => this.handleMarketData(data),
        isActive: true
      };

      this.subscriptions.set(symbol, subscription);

      // In a real implementation, this would connect to Alpaca WebSocket API or similar
      // For now, we'll simulate market data
      this.simulateMarketData(symbol);

      console.log(`Successfully subscribed to ${symbol}`);

    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from market data for a symbol
   */
  async unsubscribeFromSymbol(symbol: string): Promise<void> {
    try {
      const subscription = this.subscriptions.get(symbol);
      if (subscription) {
        subscription.isActive = false;
        this.subscriptions.delete(symbol);

        // Close WebSocket connection if exists
        const ws = this.websocketConnections.get(symbol);
        if (ws) {
          ws.close();
          this.websocketConnections.delete(symbol);
        }

        // Clear reconnect interval
        const interval = this.reconnectIntervals.get(symbol);
        if (interval) {
          clearInterval(interval);
          this.reconnectIntervals.delete(symbol);
        }

        console.log(`Unsubscribed from ${symbol}`);
      }
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
    }
  }

  /**
   * Get current market data for a symbol
   */
  async getCurrentMarketData(symbol: string): Promise<MarketDataPoint | null> {
    try {
      // First check cache
      const cached = this.priceCache.get(symbol);
      if (cached && (Date.now() - cached.timestamp.getTime()) < 60000) { // 1 minute cache
        return cached;
      }

      // In real implementation, would fetch from Alpaca API or database
      // For now, generate mock data
      const mockData = this.generateMockMarketData(symbol);
      
      // Update cache
      this.priceCache.set(symbol, mockData);

      return mockData;

    } catch (error) {
      console.error(`Failed to get market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorData | null> {
    try {
      // Check cache first
      const cached = this.technicalIndicatorsCache.get(symbol);
      if (cached && (Date.now() - cached.timestamp.getTime()) < 300000) { // 5 minute cache
        return cached;
      }

      // Calculate technical indicators
      const indicators = await this.calculateTechnicalIndicators(symbol);
      
      // Update cache
      if (indicators) {
        this.technicalIndicatorsCache.set(symbol, indicators);
      }

      return indicators;

    } catch (error) {
      console.error(`Failed to get technical indicators for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get current market condition analysis
   */
  async getMarketCondition(): Promise<MarketConditionAnalysis | null> {
    try {
      // Check cache first
      if (this.marketConditionCache && 
          (Date.now() - this.marketConditionCache.timestamp.getTime()) < 300000) { // 5 minute cache
        return this.marketConditionCache;
      }

      // Analyze current market conditions
      const condition = await this.analyzeMarketConditions();
      
      // Update cache
      if (condition) {
        this.marketConditionCache = condition;
        
        // Store in database
        await this.storeMarketCondition(condition);
      }

      return condition;

    } catch (error) {
      console.error('Failed to get market condition:', error);
      return null;
    }
  }

  /**
   * Check if market is open
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = et.getHours() + (et.getMinutes() / 60);
    const dayOfWeek = et.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if it's a weekday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if within trading hours (including pre/after market)
    return (hour >= this.marketHours.preMarket.start && hour <= this.marketHours.afterHours.end);
  }

  /**
   * Get trading session type
   */
  getTradingSession(): 'pre-market' | 'regular' | 'after-hours' | 'closed' {
    if (!this.isMarketOpen()) {
      return 'closed';
    }

    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = et.getHours() + (et.getMinutes() / 60);

    if (hour >= this.marketHours.preMarket.start && hour < this.marketHours.regular.start) {
      return 'pre-market';
    } else if (hour >= this.marketHours.regular.start && hour < this.marketHours.regular.end) {
      return 'regular';
    } else if (hour >= this.marketHours.regular.end && hour <= this.marketHours.afterHours.end) {
      return 'after-hours';
    } else {
      return 'closed';
    }
  }

  /**
   * Handle incoming market data
   */
  private handleMarketData(data: MarketDataPoint): void {
    try {
      // Update price cache
      this.priceCache.set(data.symbol, data);

      // Update database (throttled to avoid excessive writes)
      this.updateStockPrice(data);

      // Trigger technical indicator recalculation if needed
      this.scheduleIndicatorUpdate(data.symbol);

      // Emit to subscribers if needed (would implement WebSocket broadcasting here)
      console.log(`Market data updated for ${data.symbol}: ${data.price} (${data.changePercent.toFixed(2)}%)`);

    } catch (error) {
      console.error('Error handling market data:', error);
    }
  }

  /**
   * Update stock price in database (throttled)
   */
  private updateStockPrice = this.throttle(async (data: MarketDataPoint) => {
    try {
      await prisma.stockPrice.upsert({
        where: { symbol: data.symbol },
        update: {
          price: new Decimal(data.price),
          change: new Decimal(data.change),
          changePercent: new Decimal(data.changePercent),
          volume: data.volume,
          lastUpdated: data.timestamp
        },
        create: {
          symbol: data.symbol,
          price: new Decimal(data.price),
          change: new Decimal(data.change),
          changePercent: new Decimal(data.changePercent),
          volume: data.volume,
          lastUpdated: data.timestamp
        }
      });
    } catch (error) {
      console.error(`Failed to update stock price for ${data.symbol}:`, error);
    }
  }, 5000); // Throttle to once every 5 seconds per symbol

  /**
   * Calculate technical indicators for a symbol
   */
  private async calculateTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorData | null> {
    try {
      // In real implementation, would fetch historical price data and calculate indicators
      // For now, generate mock technical indicators
      const mockIndicators: TechnicalIndicatorData = {
        symbol,
        timestamp: new Date(),
        rsi: 45 + Math.random() * 20, // 45-65 range
        macd: (Math.random() - 0.5) * 2, // -1 to 1
        macdSignal: (Math.random() - 0.5) * 1.5,
        sma20: 100 + Math.random() * 20,
        sma50: 95 + Math.random() * 20,
        sma200: 90 + Math.random() * 20,
        bollBandUpper: 105 + Math.random() * 10,
        bollBandMiddle: 100 + Math.random() * 10,
        bollBandLower: 95 + Math.random() * 10,
        stoch: Math.random() * 100,
        adx: 20 + Math.random() * 60,
        williams: -20 - Math.random() * 60
      };

      return mockIndicators;

    } catch (error) {
      console.error(`Failed to calculate technical indicators for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze overall market conditions
   */
  private async analyzeMarketConditions(): Promise<MarketConditionAnalysis | null> {
    try {
      // Get SPY data as market benchmark
      const spyData = await this.getCurrentMarketData('SPY');
      const spyIndicators = await this.getTechnicalIndicators('SPY');
      
      if (!spyData || !spyIndicators) {
        return null;
      }

      // Analyze market condition based on multiple factors
      let bullishScore = 50; // Start neutral

      // Price trend analysis
      if (spyData.changePercent > 1) bullishScore += 15;
      else if (spyData.changePercent > 0) bullishScore += 5;
      else if (spyData.changePercent < -1) bullishScore -= 15;
      else if (spyData.changePercent < 0) bullishScore -= 5;

      // RSI analysis
      if (spyIndicators.rsi < 30) bullishScore += 10; // Oversold
      else if (spyIndicators.rsi > 70) bullishScore -= 10; // Overbought

      // MACD analysis
      if (spyIndicators.macd > spyIndicators.macdSignal) bullishScore += 8;
      else bullishScore -= 8;

      // Moving average analysis
      if (spyData.price > spyIndicators.sma20 && 
          spyIndicators.sma20 > spyIndicators.sma50 && 
          spyIndicators.sma50 > spyIndicators.sma200) {
        bullishScore += 12; // Strong uptrend
      } else if (spyData.price < spyIndicators.sma20 && 
                 spyIndicators.sma20 < spyIndicators.sma50 && 
                 spyIndicators.sma50 < spyIndicators.sma200) {
        bullishScore -= 12; // Strong downtrend
      }

      // Volume analysis
      if (spyData.volume > 50000000) { // High volume
        if (spyData.changePercent > 0) bullishScore += 5;
        else bullishScore -= 5;
      }

      // Determine overall condition
      let overallCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
      let trendStrength: number;
      let volatilityIndex: number;
      let marketSentiment: 'positive' | 'negative' | 'neutral';

      // Calculate volatility index (simplified VIX-like calculation)
      volatilityIndex = Math.abs(spyData.changePercent) * 5 + Math.random() * 10 + 15;

      if (volatilityIndex > 30) {
        overallCondition = 'volatile';
        trendStrength = Math.abs(bullishScore - 50);
      } else if (bullishScore >= 65) {
        overallCondition = 'bull';
        trendStrength = bullishScore - 50;
      } else if (bullishScore <= 35) {
        overallCondition = 'bear';
        trendStrength = 50 - bullishScore;
      } else {
        overallCondition = 'sideways';
        trendStrength = Math.abs(bullishScore - 50);
      }

      // Market sentiment
      if (bullishScore >= 60) marketSentiment = 'positive';
      else if (bullishScore <= 40) marketSentiment = 'negative';
      else marketSentiment = 'neutral';

      const analysis: MarketConditionAnalysis = {
        timestamp: new Date(),
        overallCondition,
        trendStrength: Math.min(100, Math.max(0, trendStrength)),
        volatilityIndex: Math.min(100, Math.max(0, volatilityIndex)),
        marketSentiment,
        confidence: Math.min(100, Math.max(50, Math.abs(bullishScore - 50) * 2))
      };

      return analysis;

    } catch (error) {
      console.error('Failed to analyze market conditions:', error);
      return null;
    }
  }

  /**
   * Store market condition analysis in database
   */
  private async storeMarketCondition(condition: MarketConditionAnalysis): Promise<void> {
    try {
      // Get additional market data for storage
      const spyData = await this.getCurrentMarketData('SPY');
      const spyIndicators = await this.getTechnicalIndicators('SPY');

      await prisma.marketCondition.create({
        data: {
          timestamp: condition.timestamp,
          overallCondition: condition.overallCondition,
          trendStrength: new Decimal(condition.trendStrength),
          volatilityIndex: new Decimal(condition.volatilityIndex),
          marketSentiment: condition.marketSentiment,
          confidence: new Decimal(condition.confidence),
          spyPrice: spyData ? new Decimal(spyData.price) : null,
          spyChange: spyData ? new Decimal(spyData.change) : null,
          spyChangePercent: spyData ? new Decimal(spyData.changePercent) : null,
          volume: spyData ? BigInt(spyData.volume) : null,
          rsi: spyIndicators ? new Decimal(spyIndicators.rsi) : null,
          macd: spyIndicators ? new Decimal(spyIndicators.macd) : null,
          sma20: spyIndicators ? new Decimal(spyIndicators.sma20) : null,
          sma50: spyIndicators ? new Decimal(spyIndicators.sma50) : null,
          sma200: spyIndicators ? new Decimal(spyIndicators.sma200) : null,
          bollBandUpper: spyIndicators ? new Decimal(spyIndicators.bollBandUpper) : null,
          bollBandLower: spyIndicators ? new Decimal(spyIndicators.bollBandLower) : null,
          dataQuality: 'good',
          analysisVersion: '1.0'
        }
      });

    } catch (error) {
      console.error('Failed to store market condition:', error);
    }
  }

  /**
   * Generate mock market data (for development/testing)
   */
  private generateMockMarketData(symbol: string): MarketDataPoint {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * basePrice * 0.02; // ±2% change
    const price = basePrice + change;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      price: Math.round(price * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      timestamp: new Date(),
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      bid: price - 0.01,
      ask: price + 0.01,
      high: price + Math.random() * price * 0.01,
      low: price - Math.random() * price * 0.01,
      open: price + (Math.random() - 0.5) * price * 0.005
    };
  }

  /**
   * Get base price for symbol (for mock data generation)
   */
  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'SPY': 400,
      'QQQ': 350,
      'IWM': 180,
      'VIX': 20,
      'TSLA': 250,
      'AAPL': 170,
      'MSFT': 300,
      'GOOGL': 120,
      'AMZN': 140
    };

    return basePrices[symbol] || 100;
  }

  /**
   * Simulate market data (for development/testing)
   */
  private simulateMarketData(symbol: string): void {
    // Generate initial data point
    const initialData = this.generateMockMarketData(symbol);
    this.handleMarketData(initialData);

    // Set up periodic updates
    const interval = setInterval(() => {
      if (!this.subscriptions.get(symbol)?.isActive) {
        clearInterval(interval);
        return;
      }

      const mockData = this.generateMockMarketData(symbol);
      this.handleMarketData(mockData);
    }, 5000 + Math.random() * 10000); // Random interval between 5-15 seconds

    // Store interval for cleanup
    this.reconnectIntervals.set(symbol, interval);
  }

  /**
   * Schedule technical indicator update (debounced)
   */
  private scheduleIndicatorUpdate = this.debounce((symbol: string) => {
    // Remove from cache to force recalculation
    this.technicalIndicatorsCache.delete(symbol);
  }, 30000); // 30 second debounce

  /**
   * Start market condition analysis
   */
  private startMarketConditionAnalysis(): void {
    // Initial analysis
    this.getMarketCondition();

    // Schedule periodic updates
    setInterval(() => {
      this.getMarketCondition();
    }, 300000); // Update every 5 minutes
  }

  /**
   * Setup cleanup intervals
   */
  private setupCleanupIntervals(): void {
    // Clean up old cache entries
    setInterval(() => {
      const now = Date.now();
      
      // Clean price cache (older than 5 minutes)
      for (const [symbol, data] of this.priceCache) {
        if (now - data.timestamp.getTime() > 300000) {
          this.priceCache.delete(symbol);
        }
      }

      // Clean technical indicators cache (older than 15 minutes)
      for (const [symbol, data] of this.technicalIndicatorsCache) {
        if (now - data.timestamp.getTime() > 900000) {
          this.technicalIndicatorsCache.delete(symbol);
        }
      }

      // Clean market condition cache (older than 10 minutes)
      if (this.marketConditionCache && 
          now - this.marketConditionCache.timestamp.getTime() > 600000) {
        this.marketConditionCache = null;
      }

    }, 60000); // Run cleanup every minute

    // Clean up old database records
    setInterval(async () => {
      try {
        // Keep only last 30 days of market conditions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        await prisma.marketCondition.deleteMany({
          where: {
            timestamp: {
              lt: thirtyDaysAgo
            }
          }
        });

        console.log('Cleaned up old market condition records');
      } catch (error) {
        console.error('Failed to clean up old records:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Throttle function utility
   */
  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    const throttled = new Map<string, number>();
    
    return (...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const now = Date.now();
      const lastCall = throttled.get(key) || 0;
      
      if (now - lastCall >= delay) {
        throttled.set(key, now);
        func(...args);
      }
    };
  }

  /**
   * Debounce function utility
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    const timeouts = new Map<string, NodeJS.Timeout>();
    
    return (...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const existingTimeout = timeouts.get(key);
      
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const newTimeout = setTimeout(() => {
        func(...args);
        timeouts.delete(key);
      }, delay);
      
      timeouts.set(key, newTimeout);
    };
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      subscriptions: this.subscriptions.size,
      activeConnections: this.websocketConnections.size,
      cacheSize: {
        prices: this.priceCache.size,
        technicalIndicators: this.technicalIndicatorsCache.size,
        marketCondition: this.marketConditionCache ? 1 : 0
      },
      isInitialized: this.isInitialized,
      marketOpen: this.isMarketOpen(),
      tradingSession: this.getTradingSession()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down Market Data Ingestion Service...');

      // Close all WebSocket connections
      for (const [symbol, ws] of this.websocketConnections) {
        ws.close();
      }

      // Clear all intervals
      for (const [symbol, interval] of this.reconnectIntervals) {
        clearInterval(interval);
      }

      // Clear subscriptions
      this.subscriptions.clear();
      this.websocketConnections.clear();
      this.reconnectIntervals.clear();

      // Clear caches
      this.priceCache.clear();
      this.technicalIndicatorsCache.clear();
      this.marketConditionCache = null;

      console.log('Market Data Ingestion Service shut down successfully');

    } catch (error) {
      console.error('Error during market data service shutdown:', error);
    }
  }
}

export default MarketDataIngestionService.getInstance();
