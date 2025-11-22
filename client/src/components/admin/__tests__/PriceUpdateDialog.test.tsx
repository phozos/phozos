import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PriceUpdateDialog from '../PriceUpdateDialog';

describe('PriceUpdateDialog', () => {
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
    price: '19000',
    currency: 'INR',
  };

  const mockOnOpenChange = vi.fn();

  it('should not prefill new price input', () => {
    render(
      <PriceUpdateDialog 
        plan={mockPlan as any} 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />,
      { wrapper }
    );
    
    const priceInput = screen.getByLabelText(/new price/i);
    expect(priceInput).toHaveValue(''); // Should be empty, not prefilled
  });

  it('should show error when entering same price', async () => {
    const user = userEvent.setup();
    
    render(
      <PriceUpdateDialog 
        plan={mockPlan as any} 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />,
      { wrapper }
    );
    
    const priceInput = screen.getByLabelText(/new price/i);
    await user.type(priceInput, '19000');
    
    await waitFor(() => {
      expect(screen.getByText(/must be different/i)).toBeInTheDocument();
    });
  });

  it('should calculate price increase correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <PriceUpdateDialog 
        plan={mockPlan as any} 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />,
      { wrapper }
    );
    
    const priceInput = screen.getByLabelText(/new price/i);
    await user.type(priceInput, '25000');
    
    await waitFor(() => {
      expect(screen.getByText(/increase from/i)).toBeInTheDocument();
      // Should show ~31.6% increase
      expect(screen.getByText(/31\.6.*%/i)).toBeInTheDocument();
    });
  });

  it('should calculate price decrease correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <PriceUpdateDialog 
        plan={mockPlan as any} 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />,
      { wrapper }
    );
    
    const priceInput = screen.getByLabelText(/new price/i);
    await user.type(priceInput, '15000');
    
    await waitFor(() => {
      expect(screen.getByText(/decrease from/i)).toBeInTheDocument();
      // Should show ~21.1% decrease
      expect(screen.getByText(/21\.[0-9]+.*%/i)).toBeInTheDocument();
    });
  });

  it('should display correct currencies', () => {
    render(
      <PriceUpdateDialog 
        plan={mockPlan as any} 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />,
      { wrapper }
    );
    
    const currencyElements = screen.getAllByText(/INR/i);
    expect(currencyElements.length).toBeGreaterThan(0);
  });
});
