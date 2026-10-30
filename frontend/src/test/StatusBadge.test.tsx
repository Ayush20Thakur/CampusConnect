import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/Badge';

describe('StatusBadge', () => {
  it('renders CONFIRMED status with appropriate text and icon', () => {
    render(<StatusBadge status="CONFIRMED" />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders WAITING status with queue label', () => {
    render(<StatusBadge status="WAITING" />);
    expect(screen.getByText('In Queue (Waiting)')).toBeInTheDocument();
  });

  it('renders CALLED status with counter label', () => {
    render(<StatusBadge status="CALLED" />);
    expect(screen.getByText('Called to Counter')).toBeInTheDocument();
  });

  it('renders COMPLETED status', () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders CANCELLED status', () => {
    render(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders fallback for unknown status without crashing', () => {
    render(<StatusBadge status="UNKNOWN_CODE" />);
    expect(screen.getByText('UNKNOWN_CODE')).toBeInTheDocument();
  });
});
