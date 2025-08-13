import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SessionAnalytics } from '../../services/sessionAnalyticsApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceChartProps {
  analytics: SessionAnalytics;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  className?: string;
}

interface PerformanceDataPoint {
  date: string;
  cumulativePnL: number;
  sessionPnL: number;
  winRate: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  analytics, 
  period, 
  className = '' 
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Generate mock historical data based on analytics
  // In a real app, this would come from the API
  const generatePerformanceData = (): PerformanceDataPoint[] => {
    const data: PerformanceDataPoint[] = [];
    const sessions = analytics.totalSessions;
    const avgPnL = analytics.averageProfitLoss;
    const winRate = analytics.winRate;
    
    let cumulativePnL = 0;
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
    const sessionCount = Math.max(sessions, 10);
    
    for (let i = 0; i < sessionCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (sessionCount - i) * (periodDays / sessionCount));
      
      // Generate realistic session P&L with some variance
      const sessionPnL = avgPnL + (Math.random() - 0.5) * avgPnL * 0.8;
      cumulativePnL += sessionPnL;
      
      // Simulate win rate fluctuation
      const sessionWinRate = winRate + (Math.random() - 0.5) * 20;
      
      data.push({
        date: date.toLocaleDateString(),
        cumulativePnL,
        sessionPnL,
        winRate: Math.max(0, Math.min(100, sessionWinRate))
      });
    }
    
    return data;
  };

  const performanceData = generatePerformanceData();

  const chartData: ChartData<'line'> = {
    labels: performanceData.map(d => d.date),
    datasets: [
      {
        label: 'Cumulative P&L',
        data: performanceData.map(d => d.cumulativePnL),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Session P&L',
        data: performanceData.map(d => d.sessionPnL),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.3,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1',
      }
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: `Performance Trend - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        font: {
          size: 16,
          weight: 'bold',
          family: 'Inter, sans-serif',
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Cumulative P&L' || label === 'Session P&L') {
              return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return `${label}: ${value.toFixed(1)}%`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Cumulative P&L ($)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + (value as number).toLocaleString();
          },
          font: {
            size: 11,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Session P&L ($)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return '$' + (value as number).toLocaleString();
          },
          font: {
            size: 11,
          },
        },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}>
      <div className="h-96">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Return</p>
          <p className={`font-semibold text-lg ${analytics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${analytics.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Win Rate</p>
          <p className="font-semibold text-lg text-blue-600">
            {analytics.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Best Session</p>
          <p className="font-semibold text-lg text-green-600">
            ${analytics.averageWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Worst Session</p>
          <p className="font-semibold text-lg text-red-600">
            -${Math.abs(analytics.averageLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
