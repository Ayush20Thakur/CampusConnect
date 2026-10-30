import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Calendar } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders title, description and calls onAction when button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Calendar}
        title="No Appointments Found"
        description="You have not booked any appointments yet."
        actionText="Book an Appointment"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Appointments Found')).toBeInTheDocument();
    expect(screen.getByText('You have not booked any appointments yet.')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /book an appointment/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

