import WebSocket from 'ws';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

interface MarketDataPoint {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  timeframe: '1min' | '5min' | '15min' | 'daily';
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MarketCondition {
  regime: 'HIGH_VOLATILITY' | 'TRENDING' | 'RANGING';
  vixLevel: number;
  trendStrength: number;
  volumeProfile: 'SPIKE' | 'NORMAL' | 'LOW';
  sectorRotation: any;
  riskMultiplier: number;
}

interface GapScanner {
  symbol: string;
  gapPercentage: number;
  preMarketVolume: number;
  volumeMultiple: number;
  newsEvents: string[];
  earningsReaction: boolean;
}

class MarketDataService {
  private alpacaStream: WebSocket | null = null;
  private redis: Redis;
  private prisma: PrismaClient;
  private isMarketOpen: boolean = false;
  private marketOpenTime = '09:30:00';
  private marketCloseTime = '16:00:00';
  
  // Top 500 stocks by volume (sample - would be dynamically updated)
  private watchedSymbols: string[] = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
    'AMD', 'INTC', 'CRM', 'ADBE', 'PYPL', 'SHOP', 'SQ', 'ROKU'
    // ... would include top 500 by volume
  ];

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize real-time market data streaming
   * Implements Alpaca WebSocket integration for live price feeds
   */
  async initializeMarketDataStream(): Promise<void> {
    try {
      const alpacaWsUrl = process.env.ALPACA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex';
      
      this.alpacaStream = new WebSocket(alpacaWsUrl);
      
      this.alpacaStream.on('open', () => {
        console.log('🔥 Alpaca WebSocket connected - Market Open Domination ready!');
        this.authenticateAlpacaStream();
        this.subscribeToMarketData();
      });

      this.alpacaStream.on('message', (data: WebSocket.Data) => {
        this.processMarketDataMessage(data);
      });

      this.alpacaStream.on('error', (error: Error) => {
        console.error('❌ Alpaca WebSocket error:', error);
        this.handleStreamError(error);
      });

      this.alpacaStream.on('close', () => {
        console.log('⚠️ Alpaca WebSocket disconnected - Attempting reconnection...');
        this.reconnectStream();
      });

    } catch (error) {
      console.error('💥 Failed to initialize market data stream:', error);
      throw error;
    }
  }

  /**
   * Authenticate with Alpaca WebSocket API
   */
  private authenticateAlpacaStream(): void {
    const authMessage = {
      action: 'auth',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_SECRET_KEY
    };
    
    this.alpacaStream?.send(JSON.stringify(authMessage));
  }

  /**
   * Subscribe to market data for watched symbols
   * Focus on top 500 stocks by volume for opportunistic hunting
   */
  private subscribeToMarketData(): void {
    const subscribeMessage = {
      action: 'subscribe',
      trades: this.watchedSymbols,
      quotes: this.watchedSymbols,
      bars: this.watchedSymbols
    };
    
    this.alpacaStream?.send(JSON.stringify(subscribeMessage));
    console.log(`📊 Subscribed to ${this.watchedSymbols.length} symbols for market data`);
  }

  /**
   * Process incoming market data messages
   * Implements multi-timeframe analysis and caching
   */
  private async processMarketDataMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.T === 't') { // Trade data
        await this.processTradeData(message);
      } else if (message.T === 'q') { // Quote data
        await this.processQuoteData(message);
      } else if (message.T === 'b') { // Bar data
        await this.processBarData(message);
      }
      
    } catch (error) {
      console.error('❌ Error processing market data:', error);
    }
  }

  /**
   * Process trade data for real-time analysis
   */
  private async processTradeData(trade: any): Promise<void> {
    const marketData: MarketDataPoint = {
      symbol: trade.S,
      price: trade.p,
      volume: trade.s,
      timestamp: new Date(trade.t),
      timeframe: '1min',
      open: trade.p,
      high: trade.p,
      low: trade.p,
      close: trade.p
    };

    // Cache in Redis for real-time access
    await this.cacheMarketData(marketData);
    
    // Check for market open opportunities
    if (this.isWithinMarketOpenWindow()) {
      await this.scanForMarketOpenOpportunities(marketData);
    }
    
    // Update multi-timeframe analysis
    await this.updateMultiTimeframeAnalysis(marketData);
  }

  /**
   * Market Open Domination - Scan for opportunities in first 30 minutes
   */
  private async scanForMarketOpenOpportunities(data: MarketDataPoint): Promise<void> {
    try {
      // Gap detection (>2% moves)
      const previousClose = await this.getPreviousClose(data.symbol);
      const gapPercentage = ((data.price - previousClose) / previousClose) * 100;
      
      if (Math.abs(gapPercentage) > 2) {
        // Volume confirmation (>2x average)
        const averageVolume = await this.getAverageVolume(data.symbol);
        const volumeMultiple = data.volume / averageVolume;
        
        if (volumeMultiple > 2) {
          const gapOpportunity: GapScanner = {
            symbol: data.symbol,
            gapPercentage,
            preMarketVolume: data.volume,
            volumeMultiple,
            newsEvents: await this.getNewsEvents(data.symbol),
            earningsReaction: await this.isEarningsReaction(data.symbol)
          };
          
          // Cache opportunity for algorithm processing
          await this.redis.setex(
            `gap_opportunity:${data.symbol}`,
            300, // 5 minutes
            JSON.stringify(gapOpportunity)
          );
          
          console.log(`🎯 GAP OPPORTUNITY: ${data.symbol} ${gapPercentage.toFixed(2)}% gap with ${volumeMultiple.toFixed(1)}x volume`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scanning market open opportunities:', error);
    }
  }

  /**
   * Check if current time is within market open window (9:30-10:00 EST)
   */
  private isWithinMarketOpenWindow(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 8);
    const marketOpenEnd = '10:00:00';
    
    return this.isMarketOpen && 
           currentTime >= this.marketOpenTime && 
           currentTime <= marketOpenEnd;
  }

  /**
   * Multi-timeframe analysis for confluence signals
   */
  private async updateMultiTimeframeAnalysis(data: MarketDataPoint): Promise<void> {
    // Update 1-minute timeframe (scalping/entry timing)
    await this.updateTimeframeData(data, '1min');
    
    // Aggregate to 5-minute timeframe (primary signals)
    if (this.shouldUpdateTimeframe('5min')) {
      await this.aggregateTimeframeData(data.symbol, '5min');
    }
    
    // Aggregate to 15-minute timeframe (trend confirmation)
    if (this.shouldUpdateTimeframe('15min')) {
      await this.aggregateTimeframeData(data.symbol, '15min');
    }
  }

  /**
   * Cache market data in Redis for high-frequency access
   */
  private async cacheMarketData(data: MarketDataPoint): Promise<void> {
    const cacheKey = `market_data:${data.symbol}:${data.timeframe}`;
    const cacheData = {
      ...data,
      timestamp: data.timestamp.toISOString()
    };
    
    // Cache for 1 minute for real-time access
    await this.redis.setex(cacheKey, 60, JSON.stringify(cacheData));
    
    // Also maintain latest price cache
    await this.redis.setex(`latest_price:${data.symbol}`, 30, data.price.toString());
  }

  /**
   * Market regime detection for strategy selection
   */
  async detectMarketRegime(): Promise<MarketCondition> {
    try {
      // Get VIX level
      const vixLevel = await this.getVIXLevel();
      
      // Analyze market trend strength
      const trendStrength = await this.analyzeTrendStrength();
      
      // Get volume profile
      const volumeProfile = await this.analyzeVolumeProfile();
      
      let regime: 'HIGH_VOLATILITY' | 'TRENDING' | 'RANGING';
      let riskMultiplier: number;
      
      if (vixLevel > 25 && volumeProfile === 'SPIKE') {
        regime = 'HIGH_VOLATILITY';
        riskMultiplier = 1.5; // Increase position sizes in high volatility
      } else if (trendStrength > 0.7) {
        regime = 'TRENDING';
        riskMultiplier = 1.2;
      } else {
        regime = 'RANGING';
        riskMultiplier = 0.8;
      }
      
      const marketCondition: MarketCondition = {
        regime,
        vixLevel,
        trendStrength,
        volumeProfile,
        sectorRotation: await this.analyzeSectorRotation(),
        riskMultiplier
      };
      
      // Cache market regime for algorithm access
      await this.redis.setex('market_regime', 300, JSON.stringify(marketCondition));
      
      return marketCondition;
      
    } catch (error) {
      console.error('❌ Error detecting market regime:', error);
      throw error;
    }
  }

  /**
   * Options flow integration for directional bias
   */
  async getOptionsFlowSignal(symbol: string): Promise<any> {
    try {
      // This would integrate with third-party options flow provider
      // For now, return mock structure
      const optionsFlow = {
        symbol,
        putCallRatio: 0.75, // Bullish bias
        unusualActivity: true,
        volumeSpike: 3.2, // 3.2x average volume
        institutionalFlow: 'BULLISH',
        confidence: 0.85
      };
      
      // Cache options flow data
      await this.redis.setex(
        `options_flow:${symbol}`,
        300,
        JSON.stringify(optionsFlow)
      );
      
      return optionsFlow;
      
    } catch (error) {
      console.error('❌ Error getting options flow:', error);
      return null;
    }
  }

  /**
   * Get earnings calendar and reaction data
   */
  async getEarningsData(symbol: string): Promise<any> {
    try {
      // Mock earnings data - would integrate with earnings calendar API
      const earningsData = {
        symbol,
        earningsDate: new Date(),
        expectedMove: 0.05, // 5% expected move
        actualSurprise: 0.02, // 2% positive surprise
        guidance: 'RAISED',
        reactionType: 'MOMENTUM_CONTINUATION'
      };
      
      return earningsData;
      
    } catch (error) {
      console.error('❌ Error getting earnings data:', error);
      return null;
    }
  }

  // Helper methods
  private async getPreviousClose(symbol: string): Promise<number> {
    // Implementation would fetch previous close from database or API
    return 100; // Mock value
  }

  private async getAverageVolume(symbol: string): Promise<number> {
    // Implementation would calculate 20-day average volume
    return 1000000; // Mock value
  }

  private async getNewsEvents(symbol: string): Promise<string[]> {
    // Implementation would fetch news events from news API
    return ['Earnings beat', 'Analyst upgrade']; // Mock values
  }

  private async isEarningsReaction(symbol: string): Promise<boolean> {
    // Implementation would check if stock reported earnings recently
    return false; // Mock value
  }

  private shouldUpdateTimeframe(timeframe: string): boolean {
    // Logic to determine when to aggregate timeframes
    return true; // Simplified for now
  }

  private async updateTimeframeData(data: MarketDataPoint, timeframe: string): Promise<void> {
    // Update specific timeframe data
  }

  private async aggregateTimeframeData(symbol: string, timeframe: string): Promise<void> {
    // Aggregate data to higher timeframes
  }

  private async getVIXLevel(): Promise<number> {
    // Fetch current VIX level
    return 20; // Mock value
  }

  private async analyzeTrendStrength(): Promise<number> {
    // Calculate market trend strength
    return 0.6; // Mock value
  }

  private async analyzeVolumeProfile(): Promise<'SPIKE' | 'NORMAL' | 'LOW'> {
    // Analyze current volume profile
    return 'NORMAL'; // Mock value
  }

  private async analyzeSectorRotation(): Promise<any> {
    // Analyze sector rotation patterns
    return { leading: 'Technology', lagging: 'Utilities' }; // Mock value
  }

  private processQuoteData(quote: any): void {
    // Process bid/ask quote data
  }

  private processBarData(bar: any): void {
    // Process bar/candlestick data
  }

  private handleStreamError(error: Error): void {
    // Handle stream errors and implement retry logic
    console.error('Stream error handled:', error.message);
  }

  private reconnectStream(): void {
    // Implement reconnection logic with exponential backoff
    setTimeout(() => {
      console.log('🔄 Reconnecting to market data stream...');
      this.initializeMarketDataStream();
    }, 5000);
  }

  /**
   * Get cached market data for algorithm consumption
   */
  async getMarketData(symbol: string, timeframe: string = '5min'): Promise<MarketDataPoint | null> {
    try {
      const cached = await this.redis.get(`market_data:${symbol}:${timeframe}`);
      if (cached) {
        const data = JSON.parse(cached);
        data.timestamp = new Date(data.timestamp);
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting cached market data:', error);
      return null;
    }
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down market data service...');
    
    if (this.alpacaStream) {
      this.alpacaStream.close();
    }
    
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

export default MarketDataService;
export { MarketDataPoint, MarketCondition, GapScanner };
