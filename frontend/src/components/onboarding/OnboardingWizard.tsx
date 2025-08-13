import React, { useState, useEffect } from 'react';
import { ProgressIndicator } from './ProgressIndicator';
import { Step1Overview } from './Step1Overview';
import { Step2RiskEducation } from './Step2RiskEducation';
import { Step3Emergency } from './Step3Emergency';
import { onboardingApi, OnboardingProgress } from '../../services/onboardingApi';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const stepTitles = [
    'Platform Overview',
    'Risk Management',
    'Emergency Controls'
  ];

  // Load initial progress
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const progressData = await onboardingApi.getProgress();
      setProgress(progressData);
      setCurrentStep(Math.max(1, progressData.currentStep));
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
      // If there's an error loading progress, start from step 1
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (step: number) => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const updatedProgress = await onboardingApi.updateProgress({
        step,
        completed: true,
        metadata: {
          completedAt: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
      setProgress(updatedProgress);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      // Continue anyway - don't block the user
    } finally {
      setUpdating(false);
    }
  };

  const handleNext = async () => {
    await updateProgress(currentStep);
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setUpdating(true);
    try {
      await onboardingApi.completeOnboarding({
        feedback: 'Onboarding completed successfully',
        preferences: {
          receiveEmails: true,
          showTips: true,
          riskTolerance: 'MODERATE'
        }
      });
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still call onComplete to not block the user
      onComplete();
    } finally {
      setUpdating(false);
    }
  };

  const handleSkip = async () => {
    try {
      await onboardingApi.skipOnboarding({
        reason: 'WANT_TO_EXPLORE',
        feedback: 'User chose to skip onboarding'
      });
      onSkip();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still call onSkip to not block the user
      onSkip();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to SmartTrade AI</h1>
          <p className="text-xl text-gray-600">Let's get you started with a quick 3-step introduction</p>
          
          {/* Skip Option */}
          <div className="mt-4">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Skip onboarding - I'm experienced with trading platforms
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={3}
          stepTitles={stepTitles}
        />

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <Step1Overview onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <Step2RiskEducation 
              onNext={handleNext} 
              onPrevious={handlePrevious}
            />
          )}
          {currentStep === 3 && (
            <Step3Emergency 
              onNext={handleNext} 
              onPrevious={handlePrevious}
            />
          )}
        </div>

        {/* Loading State */}
        {updating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {currentStep === 3 ? 'Completing onboarding...' : 'Saving progress...'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Estimated completion time: ~9 minutes</p>
          <p className="mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:support@smarttrade.ai" className="text-blue-600 hover:underline">
              support@smarttrade.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
