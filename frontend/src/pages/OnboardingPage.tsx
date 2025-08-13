import React from 'react';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';

interface OnboardingPageProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete, onSkip }) => {
  return (
    <OnboardingWizard 
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};
