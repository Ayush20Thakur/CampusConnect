import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoAccountsBanner } from '../components/DemoAccountsBanner';

describe('DemoAccountsBanner', () => {
  it('renders all 4 demo role cards and credentials', () => {
    render(<DemoAccountsBanner />);
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Clinic Staff')).toBeInTheDocument();
    expect(screen.getByText('Academic Adviser')).toBeInTheDocument();
    expect(screen.getByText('System Admin')).toBeInTheDocument();
    expect(screen.getByText('alex.kim@students.edu')).toBeInTheDocument();
    expect(screen.getByText('j.morgan@campusconnect.edu')).toBeInTheDocument();
  });

  it('triggers onSelectAccount with credentials when Use Account is clicked', () => {
    const handleSelect = vi.fn();
    render(<DemoAccountsBanner onSelectAccount={handleSelect} />);
    const useButtons = screen.getAllByRole('button', { name: /use account/i });
    expect(useButtons.length).toBe(4);
    fireEvent.click(useButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith('alex.kim@students.edu', 'student1234');
  });
});

