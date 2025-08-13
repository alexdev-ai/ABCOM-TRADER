import React, { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, XCircle, Play, Pause, MoreHorizontal } from 'lucide-react';

interface RebalancingStep {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedPrice: number;
  estimatedCost: number;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  actualPrice?: number;
  actualCost?: number;
  executionOrder: number;
}

interface RebalancingTimelineProps {
  steps: RebalancingStep[];
  title?: string;
  showEstimates?: boolean;
  showActuals?: boolean;
  onStepAction?: (stepId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => void;
  className?: string;
}

const RebalancingTimeline: React.FC<RebalancingTimelineProps> = ({
  steps,
  title = 'Rebalancing Execution Timeline',
  showEstimates = true,
  showActuals = true,
  onStepAction,
  className = ''
}) => {
  const [selectedStep, setSelectedStep] = useState<RebalancingStep | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sort steps by execution order
  const sortedSteps = [...steps].sort((a, b) => a.executionOrder - b.executionOrder);

  // Filter steps based on status
  const filteredSteps = filterStatus === 'all' 
    ? sortedSteps 
    : sortedSteps.filter(step => step.status === filterStatus);

  // Get status icon
  const getStatusIcon = (status: RebalancingStep['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get status color
  const getStatusColor = (status: RebalancingStep['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get action color
  const getActionColor = (action: RebalancingStep['action']) => {
    switch (action) {
      case 'buy':
        return 'text-green-700 bg-green-100';
      case 'sell':
        return 'text-red-700 bg-red-100';
      case 'hold':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Calculate progress
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Calculate totals
  const totalEstimatedCost = steps.reduce((sum, step) => sum + Math.abs(step.estimatedCost), 0);
  const totalActualCost = steps
    .filter(step => step.actualCost !== undefined)
    .reduce((sum, step) => sum + Math.abs(step.actualCost!), 0);

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {completedSteps} of {totalSteps} steps completed ({progressPercentage.toFixed(0)}%)
            </p>
          </div>
          
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Steps ({steps.length})</option>
            <option value="pending">Pending ({steps.filter(s => s.status === 'pending').length})</option>
            <option value="in_progress">In Progress ({steps.filter(s => s.status === 'in_progress').length})</option>
            <option value="completed">Completed ({steps.filter(s => s.status === 'completed').length})</option>
            <option value="failed">Failed ({steps.filter(s => s.status === 'failed').length})</option>
          </select>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 text-xs font-medium">Total Steps</div>
            <div className="text-xl font-bold text-gray-900">{totalSteps}</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs font-medium">In Progress</div>
            <div className="text-xl font-bold text-blue-900">
              {steps.filter(s => s.status === 'in_progress').length}
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs font-medium">Completed</div>
            <div className="text-xl font-bold text-green-900">{completedSteps}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 text-xs font-medium">Est. Cost</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(totalEstimatedCost)}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {filteredSteps.map((step, index) => (
            <div
              key={step.id}
              className={`relative flex items-start gap-4 p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
                selectedStep?.id === step.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedStep(selectedStep?.id === step.id ? null : step)}
            >
              {/* Timeline connector */}
              {index < filteredSteps.length - 1 && (
                <div className="absolute left-8 top-12 w-0.5 h-12 bg-gray-200" />
              )}

              {/* Status icon */}
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      #{step.executionOrder} {step.symbol}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(step.action)}`}>
                      {step.action.toUpperCase()}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(step.status)}`}>
                      {step.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Action buttons */}
                  {onStepAction && (step.status === 'pending' || step.status === 'in_progress' || step.status === 'failed') && (
                    <div className="flex items-center gap-1">
                      {step.status === 'in_progress' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepAction(step.id, 'pause');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      {step.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepAction(step.id, 'resume');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Resume"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {step.status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepAction(step.id, 'retry');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Retry"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepAction(step.id, 'cancel');
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Cancel"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <div className="font-medium">{step.quantity.toLocaleString()}</div>
                  </div>
                  
                  {showEstimates && (
                    <>
                      <div>
                        <span className="text-gray-500">Est. Price:</span>
                        <div className="font-medium">{formatCurrency(step.estimatedPrice)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Est. Cost:</span>
                        <div className="font-medium">{formatCurrency(step.estimatedCost)}</div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <div className="font-medium">{step.priority.toFixed(1)}</div>
                  </div>
                </div>

                {/* Timing information */}
                {(step.scheduledTime || step.startedAt || step.completedAt) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                    {step.scheduledTime && (
                      <div>
                        <span className="font-medium">Scheduled:</span> {formatTime(step.scheduledTime)}
                      </div>
                    )}
                    {step.startedAt && (
                      <div>
                        <span className="font-medium">Started:</span> {formatTime(step.startedAt)}
                      </div>
                    )}
                    {step.completedAt && (
                      <div>
                        <span className="font-medium">Completed:</span> {formatTime(step.completedAt)}
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {step.status === 'failed' && step.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {step.errorMessage}
                  </div>
                )}

                {/* Actual vs Estimated (expanded view) */}
                {selectedStep?.id === step.id && showActuals && (step.actualPrice || step.actualCost) && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Actual vs Estimated</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {step.actualPrice && (
                        <div>
                          <div className="text-gray-500">Actual Price:</div>
                          <div className="font-medium">{formatCurrency(step.actualPrice)}</div>
                          <div className={`text-xs ${
                            step.actualPrice > step.estimatedPrice ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {step.actualPrice > step.estimatedPrice ? '+' : ''}
                            {formatCurrency(step.actualPrice - step.estimatedPrice)}
                          </div>
                        </div>
                      )}
                      {step.actualCost && (
                        <div>
                          <div className="text-gray-500">Actual Cost:</div>
                          <div className="font-medium">{formatCurrency(step.actualCost)}</div>
                          <div className={`text-xs ${
                            Math.abs(step.actualCost) > Math.abs(step.estimatedCost) ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {Math.abs(step.actualCost) > Math.abs(step.estimatedCost) ? '+' : ''}
                            {formatCurrency(Math.abs(step.actualCost) - Math.abs(step.estimatedCost))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredSteps.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filterStatus === 'all' 
                ? 'No rebalancing steps to display' 
                : `No ${filterStatus.replace('_', ' ')} steps`}
            </p>
          </div>
        )}

        {/* Summary stats */}
        {steps.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <span className="text-gray-500">Average Priority:</span>
                <div className="font-medium text-gray-900">
                  {(steps.reduce((sum, s) => sum + s.priority, 0) / steps.length).toFixed(1)}
                </div>
              </div>
              <div className="text-center">
                <span className="text-gray-500">Success Rate:</span>
                <div className="font-medium text-gray-900">
                  {totalSteps > 0 ? ((completedSteps / totalSteps) * 100).toFixed(0) : 0}%
                </div>
              </div>
              {showActuals && totalActualCost > 0 && (
                <div className="text-center">
                  <span className="text-gray-500">Actual Cost:</span>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(totalActualCost)}
                  </div>
                </div>
              )}
              <div className="text-center">
                <span className="text-gray-500">Failed Steps:</span>
                <div className="font-medium text-gray-900">
                  {steps.filter(s => s.status === 'failed').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RebalancingTimeline;
