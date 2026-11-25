import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Companion2DFallback } from '@/components/characters/Companion2DFallback';
import { SunBatteryGauge } from '@/components/common/SunBatteryGauge';
import { LoginPage } from '@/pages/onboarding/LoginPage';

describe('Phygital UI Components', () => {
  it('renders SunBatteryGauge with clamped percentage', () => {
    render(<SunBatteryGauge level={75} />);
    expect(screen.getByText('Offline Sun-Battery')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('triggers character tap callbacks on Companion2DFallback', () => {
    const onTap = vi.fn();
    render(<Companion2DFallback animation="idle" onTapCharacter={onTap} />);
    fireEvent.click(screen.getByLabelText('Tap Leo the Inventor'));
    fireEvent.click(screen.getByLabelText('Tap Maya the Explorer'));
    expect(onTap).toHaveBeenCalledWith('leo');
    expect(onTap).toHaveBeenCalledWith('maya');
  });

  it('renders Parent Sign In screen with link to onboarding', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Welcome Back to Phygital')).toBeInTheDocument();
    expect(screen.getByText('Start Storybook Onboarding')).toBeInTheDocument();
  });
});
