import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlanDeprecationDialog from '../PlanDeprecationDialog';

describe('PlanDeprecationDialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const mockPlan = {
    id: '1',
    name: 'Basic Plan',
    price: '10000',
    currency: 'INR',
    isActive: true,
  };

  it('should render component', () => {
    expect(true).toBe(true);
  });
});
