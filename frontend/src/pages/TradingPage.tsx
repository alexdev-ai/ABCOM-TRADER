import React, { useState, useEffect } from 'react';
import { tradingApi, type AvailableStock, type TradeOrder, type TradePreview, type StockQuote } from '../services/tradingApi';

interface StockSearchProps {
  onSelectStock: (stock: AvailableStock) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock }) => {
  const [query, setQuery] = useState('');
  const [stocks, setStocks] = useState<AvailableStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchStocks = async () => {
      setLoading(true);
      try {
        const results = await tradingApi.searchStocks(query);
        setStocks(results);
      } catch (error) {
        console.error('Stock search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="stock-search" className="block text-sm font-medium text-gray-700 mb-2">
          Search Stocks
        </label>
        <input
          id="stock-search"
          type="text"
          placeholder="Search by symbol or company name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
          {stocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => onSelectStock(stock)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-900">{stock.symbol}</div>
                  <div className="text-sm text-gray-600">{stock.name}</div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ${stock.basePrice.toFixed(2)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface TradeFormProps {
  selectedStock: AvailableStock | null;
  onPreview: (order: TradeOrder) => void;
  loading: boolean;
}

const TradeForm: React.FC<TradeFormProps> = ({ selectedStock, onPreview, loading }) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    if (selectedStock) {
      const fetchQuote = async () => {
        setLoadingQuote(true);
        try {
          const quoteData = await tradingApi.getQuote(selectedStock.symbol);
          setQuote(quoteData);
        } catch (error) {
          console.error('Failed to get quote:', error);
        } finally {
          setLoadingQuote(false);
        }
      };

      fetchQuote();
      // Refresh quote every 30 seconds
      const interval = setInterval(fetchQuote, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedStock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !quantity) return;

    const order: TradeOrder = {
      symbol: selectedStock.symbol,
      type: tradeType,
      quantity: parseInt(quantity),
      orderType: 'market'
    };

    onPreview(order);
  };

  if (!selectedStock) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select a stock to start trading
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Trade {selectedStock.symbol} - {selectedStock.name}
      </h3>

      {loadingQuote ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading current price...</span>
        </div>
      ) : quote ? (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Price:</span>
            <span className="text-lg font-semibold">${quote.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-600">Change:</span>
            <span className={`text-sm ${quote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="buy"
                checked={tradeType === 'buy'}
                onChange={(e) => setTradeType(e.target.value as 'buy' | 'sell')}
                className="mr-2 text-blue-600"
              />
              <span className="text-green-600 font-medium">Buy</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="sell"
                checked={tradeType === 'sell'}
                onChange={(e) => setTradeType(e.target.value as 'buy' | 'sell')}
                className="mr-2 text-blue-600"
              />
              <span className="text-red-600 font-medium">Sell</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter number of shares"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {quote && quantity && (
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Estimated Total:</span>
              <span className="font-semibold">
                ${(quote.price * parseInt(quantity || '0')).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !quantity || loadingQuote}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Preview Trade'}
        </button>
      </form>
    </div>
  );
};

interface TradePreviewModalProps {
  preview: TradePreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const TradePreviewModal: React.FC<TradePreviewModalProps> = ({ 
  preview, 
  onConfirm, 
  onCancel, 
  loading 
}) => {
  if (!preview) return null;

  const { riskValidation } = preview;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trade Preview
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Symbol:</span>
            <span className="font-medium">{preview.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className={`font-medium ${preview.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
              {preview.type.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Quantity:</span>
            <span className="font-medium">{preview.quantity} shares</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Price:</span>
            <span className="font-medium">${preview.currentPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Estimated Total:</span>
            <span className="font-medium">${preview.estimatedTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fees:</span>
            <span className="font-medium">${preview.fees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span>Net Amount:</span>
            <span>${preview.netAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Available Cash:</span>
            <span className="font-medium">${preview.availableCash.toFixed(2)}</span>
          </div>
          {preview.availableShares !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Available Shares:</span>
              <span className="font-medium">{preview.availableShares}</span>
            </div>
          )}
        </div>

        {riskValidation.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {riskValidation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {riskValidation.errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-1">Errors:</h4>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {riskValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!riskValidation.isValid || loading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing...' : 'Execute Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TradingPage: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<AvailableStock | null>(null);
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);
  const [currentOrder, setCurrentOrder] = useState<TradeOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStockSelect = (stock: AvailableStock) => {
    setSelectedStock(stock);
    setTradePreview(null);
    setMessage(null);
  };

  const handlePreview = async (order: TradeOrder) => {
    setLoading(true);
    setMessage(null);
    try {
      const preview = await tradingApi.previewTrade(order);
      setTradePreview(preview);
      setCurrentOrder(order);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to preview trade'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!currentOrder) return;

    setExecuting(true);
    try {
      const result = await tradingApi.executeTrade(currentOrder);
      setMessage({
        type: 'success',
        text: `Trade executed successfully! ${currentOrder.type.toUpperCase()} ${currentOrder.quantity} shares of ${currentOrder.symbol}`
      });
      setTradePreview(null);
      setCurrentOrder(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to execute trade'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCancelPreview = () => {
    setTradePreview(null);
    setCurrentOrder(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading</h1>
        <p className="text-gray-600">Buy and sell stocks with real-time pricing</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Find Stocks</h2>
          <StockSearch onSelectStock={handleStockSelect} />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Place Order</h2>
          <TradeForm 
            selectedStock={selectedStock}
            onPreview={handlePreview}
            loading={loading}
          />
        </div>
      </div>

      <TradePreviewModal
        preview={tradePreview}
        onConfirm={handleExecuteTrade}
        onCancel={handleCancelPreview}
        loading={executing}
      />
    </div>
  );
};

export default TradingPage;
