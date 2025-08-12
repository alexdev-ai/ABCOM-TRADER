import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

interface MarketDataResponse {
  success: boolean;
  data?: StockQuote;
  error?: string;
}

class MarketDataService {
  // Popular demo stocks with realistic base prices
  private readonly DEMO_STOCKS = {
    'AAPL': { basePrice: 175.00, name: 'Apple Inc.' },
    'GOOGL': { basePrice: 125.00, name: 'Alphabet Inc.' },
    'MSFT': { basePrice: 350.00, name: 'Microsoft Corporation' },
    'AMZN': { basePrice: 145.00, name: 'Amazon.com Inc.' },
    'TSLA': { basePrice: 240.00, name: 'Tesla Inc.' },
    'NVDA': { basePrice: 450.00, name: 'NVIDIA Corporation' },
    'JPM': { basePrice: 145.00, name: 'JPMorgan Chase & Co.' },
    'JNJ': { basePrice: 160.00, name: 'Johnson & Johnson' },
    'V': { basePrice: 250.00, name: 'Visa Inc.' },
    'PG': { basePrice: 155.00, name: 'Procter & Gamble Co.' }
  };

  /**
   * Get current stock price (simulated)
   */
  async getStockPrice(symbol: string): Promise<MarketDataResponse> {
    try {
      // Check if symbol exists in our demo stocks
      const stockInfo = this.DEMO_STOCKS[symbol.toUpperCase() as keyof typeof this.DEMO_STOCKS];
      if (!stockInfo) {
        return {
          success: false,
          error: `Stock symbol ${symbol} not found in demo data`
        };
      }

      // Try to get from database first
      const existingPrice = await prisma.stockPrice.findFirst({
        where: { symbol: symbol.toUpperCase() },
        orderBy: { lastUpdated: 'desc' }
      });

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // If we have recent data (less than 5 minutes old), return it
      if (existingPrice && existingPrice.lastUpdated > fiveMinutesAgo) {
        return {
          success: true,
          data: {
            symbol: existingPrice.symbol,
            price: parseFloat(existingPrice.price.toString()),
            change: parseFloat(existingPrice.change.toString()),
            changePercent: parseFloat(existingPrice.changePercent.toString()),
            volume: existingPrice.volume,
            lastUpdated: existingPrice.lastUpdated
          }
        };
      }

      // Generate new simulated price
      const simulatedQuote = this.generateSimulatedPrice(symbol.toUpperCase(), stockInfo.basePrice);

      // Store in database
      await prisma.stockPrice.create({
        data: {
          symbol: simulatedQuote.symbol,
          price: simulatedQuote.price,
          change: simulatedQuote.change,
          changePercent: simulatedQuote.changePercent,
          volume: simulatedQuote.volume,
          lastUpdated: now
        }
      });

      return {
        success: true,
        data: simulatedQuote
      };

    } catch (error) {
      console.error('Market data service error:', error);
      return {
        success: false,
        error: 'Failed to fetch market data'
      };
    }
  }

  /**
   * Get multiple stock prices
   */
  async getMultipleStockPrices(symbols: string[]): Promise<{ [symbol: string]: StockQuote }> {
    const results: { [symbol: string]: StockQuote } = {};

    for (const symbol of symbols) {
      const response = await this.getStockPrice(symbol);
      if (response.success && response.data) {
        results[symbol.toUpperCase()] = response.data;
      }
    }

    return results;
  }

  /**
   * Generate simulated stock price with realistic movement
   */
  private generateSimulatedPrice(symbol: string, basePrice: number): StockQuote {
    // Generate realistic price movement (-5% to +5% from base)
    const randomFactor = (Math.random() - 0.5) * 0.1; // -5% to +5%
    const currentPrice = basePrice * (1 + randomFactor);
    
    // Calculate daily change (simulated)
    const dailyChangeFactor = (Math.random() - 0.5) * 0.06; // -3% to +3% daily change
    const previousPrice = currentPrice / (1 + dailyChangeFactor);
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    // Generate realistic volume
    const baseVolume = Math.floor(Math.random() * 10000000) + 1000000; // 1M to 11M shares

    return {
      symbol,
      price: Math.round(currentPrice * 100) / 100, // Round to 2 decimal places
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: baseVolume,
      lastUpdated: new Date()
    };
  }

  /**
   * Get list of available demo stocks
   */
  getAvailableStocks(): Array<{ symbol: string; name: string; basePrice: number }> {
    return Object.entries(this.DEMO_STOCKS).map(([symbol, info]) => ({
      symbol,
      name: info.name,
      basePrice: info.basePrice
    }));
  }

  /**
   * Initialize demo stock prices in database
   */
  async initializeDemoData(): Promise<void> {
    try {
      const symbols = Object.keys(this.DEMO_STOCKS);
      
      for (const symbol of symbols) {
        // Check if we already have recent data
        const existing = await prisma.stockPrice.findFirst({
          where: { symbol },
          orderBy: { lastUpdated: 'desc' }
        });

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        // Only create if no recent data exists
        if (!existing || existing.lastUpdated < oneHourAgo) {
          await this.getStockPrice(symbol); // This will create new data
        }
      }

      console.log('✅ Demo market data initialized');
    } catch (error) {
      console.error('Failed to initialize demo market data:', error);
    }
  }
}

export default new MarketDataService();
