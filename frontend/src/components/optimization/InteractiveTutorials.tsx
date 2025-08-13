import React, { useState } from 'react';
import { GraduationCap, Play, ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Target } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  interactive?: {
    type: 'quiz' | 'slider' | 'drag-drop' | 'calculation';
    question?: string;
    options?: string[];
    correctAnswer?: string | number;
    explanation?: string;
    sliderConfig?: {
      min: number;
      max: number;
      step: number;
      label: string;
      targetValue: number;
    };
    calculationConfig?: {
      formula: string;
      inputs: { name: string; value: number; editable: boolean }[];
      expectedResult: number;
    };
  };
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  learningObjectives: string[];
  steps: TutorialStep[];
}

interface InteractiveTutorialsProps {
  tutorials: Tutorial[];
  title?: string;
  onComplete?: (tutorialId: string, score: number) => void;
  className?: string;
}

const InteractiveTutorials: React.FC<InteractiveTutorialsProps> = ({
  tutorials,
  title = 'Interactive Learning Tutorials',
  onComplete,
  className = ''
}) => {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [stepId: string]: any }>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Default tutorials if none provided
  const defaultTutorials: Tutorial[] = [
    {
      id: 'portfolio-basics',
      title: 'Portfolio Construction Basics',
      description: 'Learn the fundamentals of building a diversified investment portfolio',
      difficulty: 'beginner',
      estimatedTime: 15,
      learningObjectives: [
        'Understand the importance of diversification',
        'Learn how to calculate portfolio weights',
        'Grasp basic risk-return concepts'
      ],
      steps: [
        {
          id: 'intro',
          title: 'Welcome to Portfolio Construction',
          content: 'A portfolio is a collection of investments held by an individual or institution. The key to successful investing is not putting all your eggs in one basket - this is called diversification.'
        },
        {
          id: 'diversification-quiz',
          title: 'Understanding Diversification',
          content: 'Diversification helps reduce risk by spreading investments across different assets that don\'t move in the same direction.',
          interactive: {
            type: 'quiz',
            question: 'Which portfolio is better diversified?',
            options: [
              'Portfolio A: 100% Apple stock',
              'Portfolio B: 25% Apple, 25% Microsoft, 25% government bonds, 25% gold',
              'Portfolio C: 50% Apple, 50% Microsoft'
            ],
            correctAnswer: 'Portfolio B: 25% Apple, 25% Microsoft, 25% government bonds, 25% gold',
            explanation: 'Portfolio B is better diversified because it includes different asset classes (stocks, bonds, commodities) that respond differently to market conditions.'
          }
        },
        {
          id: 'weight-calculation',
          title: 'Calculating Portfolio Weights',
          content: 'Portfolio weights show what percentage of your total portfolio each investment represents.',
          interactive: {
            type: 'calculation',
            calculationConfig: {
              formula: 'Weight = Investment Value / Total Portfolio Value',
              inputs: [
                { name: 'Stock A Value', value: 5000, editable: true },
                { name: 'Stock B Value', value: 3000, editable: true },
                { name: 'Bonds Value', value: 2000, editable: true }
              ],
              expectedResult: 0.5 // 50% for Stock A
            }
          }
        },
        {
          id: 'risk-return-slider',
          title: 'Risk-Return Tradeoff',
          content: 'Higher potential returns usually come with higher risk. Find the right balance for your goals.',
          interactive: {
            type: 'slider',
            question: 'Adjust the risk level to target a 8% annual return:',
            sliderConfig: {
              min: 0,
              max: 20,
              step: 1,
              label: 'Risk Level (%)',
              targetValue: 12
            }
          }
        }
      ]
    },
    {
      id: 'modern-portfolio-theory',
      title: 'Modern Portfolio Theory',
      description: 'Dive deep into MPT and learn how to optimize portfolio allocation',
      difficulty: 'intermediate',
      estimatedTime: 25,
      learningObjectives: [
        'Understand the efficient frontier concept',
        'Learn about correlation and its impact',
        'Calculate optimal portfolio weights'
      ],
      steps: [
        {
          id: 'mpt-intro',
          title: 'Introduction to MPT',
          content: 'Modern Portfolio Theory, developed by Harry Markowitz, provides a mathematical framework for building optimal portfolios that maximize return for a given level of risk.'
        },
        {
          id: 'correlation-concept',
          title: 'Understanding Correlation',
          content: 'Correlation measures how two assets move relative to each other. It ranges from -1 (perfect negative correlation) to +1 (perfect positive correlation).',
          interactive: {
            type: 'quiz',
            question: 'If two stocks have a correlation of -0.8, what does this mean?',
            options: [
              'They move in exactly the same direction',
              'They move in opposite directions most of the time',
              'They have no relationship',
              'One is 80% more volatile than the other'
            ],
            correctAnswer: 'They move in opposite directions most of the time',
            explanation: 'A correlation of -0.8 indicates a strong negative relationship, meaning when one stock goes up, the other tends to go down.'
          }
        },
        {
          id: 'efficient-frontier-concept',
          title: 'The Efficient Frontier',
          content: 'The efficient frontier represents the set of optimal portfolios offering the highest expected return for each level of risk.',
          interactive: {
            type: 'drag-drop',
            question: 'Drag the portfolio to the efficient frontier'
          }
        }
      ]
    },
    {
      id: 'advanced-optimization',
      title: 'Advanced Optimization Techniques',
      description: 'Master advanced concepts like Black-Litterman and risk parity',
      difficulty: 'advanced',
      estimatedTime: 40,
      learningObjectives: [
        'Understand Black-Litterman model',
        'Learn risk parity allocation',
        'Apply advanced optimization constraints'
      ],
      steps: [
        {
          id: 'black-litterman-intro',
          title: 'Black-Litterman Model',
          content: 'The Black-Litterman model addresses some limitations of traditional MPT by incorporating market equilibrium assumptions and investor views.'
        },
        {
          id: 'risk-parity-concept',
          title: 'Risk Parity',
          content: 'Risk parity allocates capital so that each asset contributes equally to portfolio risk, rather than having equal dollar amounts.'
        }
      ]
    }
  ];

  const allTutorials = tutorials.length > 0 ? tutorials : defaultTutorials;
  
  // Filter tutorials by difficulty
  const filteredTutorials = allTutorials.filter(tutorial => 
    filterDifficulty === 'all' || tutorial.difficulty === filterDifficulty
  );

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle tutorial selection
  const startTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentStep(0);
    setUserAnswers({});
    setCompletedSteps([]);
  };

  // Handle step navigation
  const nextStep = () => {
    if (selectedTutorial && currentStep < selectedTutorial.steps.length - 1) {
      const currentStepData = selectedTutorial.steps[currentStep];
      if (!completedSteps.includes(currentStepData.id)) {
        setCompletedSteps(prev => [...prev, currentStepData.id]);
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle interactive responses
  const handleAnswer = (stepId: string, answer: any) => {
    setUserAnswers(prev => ({ ...prev, [stepId]: answer }));
  };

  // Check if answer is correct
  const isAnswerCorrect = (step: TutorialStep, answer: any) => {
    if (!step.interactive) return false;
    
    switch (step.interactive.type) {
      case 'quiz':
        return answer === step.interactive.correctAnswer;
      case 'slider':
        const target = step.interactive.sliderConfig?.targetValue || 0;
        return Math.abs(answer - target) <= 2; // Allow 2 unit tolerance
      case 'calculation':
        return Math.abs(answer - (step.interactive.calculationConfig?.expectedResult || 0)) < 0.01;
      default:
        return true;
    }
  };

  // Calculate tutorial completion
  const calculateProgress = () => {
    if (!selectedTutorial) return 0;
    return (completedSteps.length / selectedTutorial.steps.length) * 100;
  };

  // Complete tutorial
  const completeTutorial = () => {
    if (!selectedTutorial) return;
    
    const correctAnswers = selectedTutorial.steps.filter(step => 
      step.interactive && isAnswerCorrect(step, userAnswers[step.id])
    ).length;
    
    const totalInteractiveSteps = selectedTutorial.steps.filter(step => step.interactive).length;
    const score = totalInteractiveSteps > 0 ? (correctAnswers / totalInteractiveSteps) * 100 : 100;
    
    if (onComplete) {
      onComplete(selectedTutorial.id, score);
    }
    
    setSelectedTutorial(null);
    setCurrentStep(0);
    setUserAnswers({});
    setCompletedSteps([]);
  };

  if (selectedTutorial) {
    const currentStepData = selectedTutorial.steps[currentStep];
    const progress = calculateProgress();
    const isLastStep = currentStep === selectedTutorial.steps.length - 1;
    const userAnswer = userAnswers[currentStepData.id];

    return (
      <div className={`relative ${className}`}>
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Tutorial Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTutorial(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedTutorial.title}</h3>
                <p className="text-sm text-gray-600">
                  Step {currentStep + 1} of {selectedTutorial.steps.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Progress</div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-4">
              {currentStepData.title}
            </h4>
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed">
                {currentStepData.content}
              </p>
            </div>

            {/* Interactive Elements */}
            {currentStepData.interactive && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                {currentStepData.interactive.type === 'quiz' && (
                  <div>
                    <h5 className="font-medium text-blue-900 mb-4">
                      {currentStepData.interactive.question}
                    </h5>
                    <div className="space-y-2">
                      {currentStepData.interactive.options?.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswer(currentStepData.id, option)}
                          className={`w-full text-left p-3 rounded-md border transition-colors ${
                            userAnswer === option
                              ? isAnswerCorrect(currentStepData, option)
                                ? 'border-green-500 bg-green-100 text-green-800'
                                : 'border-red-500 bg-red-100 text-red-800'
                              : 'border-gray-300 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {userAnswer && currentStepData.interactive.explanation && (
                      <div className="mt-4 p-3 bg-blue-100 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {currentStepData.interactive.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {currentStepData.interactive.type === 'slider' && currentStepData.interactive.sliderConfig && (
                  <div>
                    <h5 className="font-medium text-blue-900 mb-4">
                      {currentStepData.interactive.question}
                    </h5>
                    <div className="space-y-4">
                      <input
                        type="range"
                        min={currentStepData.interactive.sliderConfig.min}
                        max={currentStepData.interactive.sliderConfig.max}
                        step={currentStepData.interactive.sliderConfig.step}
                        value={userAnswer || currentStepData.interactive.sliderConfig.min}
                        onChange={(e) => handleAnswer(currentStepData.id, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{currentStepData.interactive.sliderConfig.min}%</span>
                        <span className="font-medium">
                          Current: {userAnswer || currentStepData.interactive.sliderConfig.min}%
                        </span>
                        <span>{currentStepData.interactive.sliderConfig.max}%</span>
                      </div>
                      {userAnswer && (
                        <div className={`p-3 rounded-md ${
                          isAnswerCorrect(currentStepData, userAnswer)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isAnswerCorrect(currentStepData, userAnswer)
                            ? '✓ Great! You found the optimal risk level.'
                            : `Target is around ${currentStepData.interactive.sliderConfig.targetValue}%. Keep adjusting!`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStepData.interactive.type === 'calculation' && currentStepData.interactive.calculationConfig && (
                  <div>
                    <h5 className="font-medium text-blue-900 mb-4">
                      Calculate the portfolio weight for Stock A:
                    </h5>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-100 rounded-md font-mono text-sm">
                        {currentStepData.interactive.calculationConfig.formula}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currentStepData.interactive.calculationConfig.inputs.map((input, index) => (
                          <div key={index}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {input.name}
                            </label>
                            <input
                              type="number"
                              value={input.value}
                              disabled={!input.editable}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your Answer (Stock A Weight):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.50"
                          value={userAnswer || ''}
                          onChange={(e) => handleAnswer(currentStepData.id, parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {userAnswer && (
                        <div className={`p-3 rounded-md ${
                          isAnswerCorrect(currentStepData, userAnswer)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isAnswerCorrect(currentStepData, userAnswer)
                            ? '✓ Correct! Stock A represents 50% of the portfolio.'
                            : `Not quite. Try calculating: $5,000 ÷ $10,000 = 0.50 or 50%`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {selectedTutorial.steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index < currentStep ? 'bg-green-500' :
                    index === currentStep ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                onClick={completeTutorial}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Complete Tutorial
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Level:</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Tutorials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial) => (
            <div
              key={tutorial.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{tutorial.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{tutorial.description}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(tutorial.difficulty)}`}>
                  {tutorial.difficulty}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="h-4 w-4" />
                  <span>{tutorial.estimatedTime} minutes</span>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Learning Objectives:</h5>
                  <ul className="space-y-1">
                    {tutorial.learningObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => startTutorial(tutorial)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="h-4 w-4" />
                Start Tutorial
              </button>
            </div>
          ))}
        </div>

        {filteredTutorials.length === 0 && (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No tutorials found for the selected difficulty level.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveTutorials;
