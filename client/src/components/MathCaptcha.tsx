import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MathCaptchaProps {
  onVerify: (challenge: string, answer: string) => void;
  onAnswerChange?: (answer: string) => void;
}

export default function MathCaptcha({ onVerify, onAnswerChange }: MathCaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('+');
  const [answer, setAnswer] = useState('');
  const [challenge, setChallenge] = useState('');

  // Generate new math problem
  const generateProblem = () => {
    const n1 = Math.floor(Math.random() * 10) + 1; // 1-10
    const n2 = Math.floor(Math.random() * 10) + 1; // 1-10
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    // Ensure positive results for subtraction
    const [first, second] = op === '-' && n1 < n2 ? [n2, n1] : [n1, n2];
    const expectedAnswer = op === '+' ? first + second : first - second;
    
    setNum1(first);
    setNum2(second);
    setOperation(op);
    
    // Create encoded challenge
    const challengeData = `${first} ${op} ${second}:${expectedAnswer}`;
    const encodedChallenge = btoa(challengeData);
    setChallenge(encodedChallenge);
    
    // Reset answer
    setAnswer('');
    
    // Notify parent
    onVerify(encodedChallenge, '');
  };

  // Initialize on mount
  useEffect(() => {
    generateProblem();
  }, []);

  // Handle answer change
  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    onAnswerChange?.(value);
    onVerify(challenge, value);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="mathAnswer">Security Verification</Label>
      <div className="flex items-center space-x-2">
        <div className="bg-muted px-3 py-2 rounded text-sm font-mono">
          {num1} {operation} {num2} = ?
        </div>
        <Input
          id="mathAnswer"
          type="number"
          value={answer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder="Answer"
          className="w-20"
          required
        />
        <button
          type="button"
          onClick={generateProblem}
          className="text-xs text-muted-foreground hover:text-primary"
          title="New problem"
        >
          🔄
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Please solve the math problem above
      </p>
    </div>
  );
}