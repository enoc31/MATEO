import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CashDenominationCounter } from './CashDenominationCounter';
import {
  createDefaultMultiCurrencyRates,
  createEmptyMultiCurrencyCounts,
  type CashCurrencyCode,
} from '../utils/currencyDenominations';

const CounterHarness: React.FC = () => {
  const [counts, setCounts] = useState(createEmptyMultiCurrencyCounts());
  const [rates, setRates] = useState(createDefaultMultiCurrencyRates(50));

  const handleChangeCount = (currency: CashCurrencyCode, denomination: number, count: number) => {
    setCounts((prev) => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [denomination]: count,
      },
    }));
  };

  const handleChangeRate = (currency: CashCurrencyCode, rate: number) => {
    setRates((prev) => ({
      ...prev,
      [currency]: rate,
    }));
  };

  const handleClearCurrency = (currency: CashCurrencyCode) => {
    setCounts((prev) => ({
      ...prev,
      [currency]: {},
    }));
  };

  return (
    <CashDenominationCounter
      counts={counts}
      rates={rates}
      onChangeCount={handleChangeCount}
      onChangeRate={handleChangeRate}
      onClearCurrency={handleClearCurrency}
      onClearAll={() => setCounts(createEmptyMultiCurrencyCounts())}
    />
  );
};

describe('CashDenominationCounter', () => {
  it('renders banknote thumbnails for the active cone and preserves counts across multiple cones in one session', () => {
    render(<CounterHarness />);

    // Default active cone is VES
    expect(screen.getByTestId('banknote-thumb-VES-500')).toBeInTheDocument();

    // Enter 2 bills of Bs. 500 (= Bs. 1.000, @ 50 Bs/$ = $20,00 USD)
    const ves500Input = screen.getByTestId('bill-input-VES-500');
    fireEvent.change(ves500Input, { target: { value: '2' } });
    expect(screen.getByTestId('cone-badge-VES')).toHaveTextContent('2');

    // Switch to USD cone
    fireEvent.click(screen.getByTestId('cone-tab-USD'));
    expect(screen.getByTestId('banknote-thumb-USD-100')).toBeInTheDocument();

    // Add 3 bills of $20 (= $60,00 USD)
    const usd20Input = screen.getByTestId('bill-input-USD-20');
    fireEvent.change(usd20Input, { target: { value: '3' } });

    // Switch to EUR cone and increment €50 bill using the + button
    fireEvent.click(screen.getByTestId('cone-tab-EUR'));
    expect(screen.getByTestId('banknote-thumb-EUR-50')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('rate-input-EUR'), { target: { value: '1.1' } });
    fireEvent.click(screen.getByLabelText('Sumar billete de €50 (EUR)'));

    // Switch to COP cone and enter 1 bill of $100.000 COP at rate 4000 (= $25,00 USD)
    fireEvent.click(screen.getByTestId('cone-tab-COP'));
    expect(screen.getByTestId('banknote-thumb-COP-100000')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('rate-input-COP'), { target: { value: '4000' } });
    fireEvent.change(screen.getByTestId('bill-input-COP-100000'), { target: { value: '1' } });

    // Check consolidated multi-currency session summary:
    // VES: $20 + USD: $60 + EUR: $55 + COP: $25 = $160,00 USD
    expect(screen.getByTestId('multicurrency-session-summary')).toBeInTheDocument();
    expect(screen.getByTestId('consolidated-usd-total')).toHaveTextContent('$160,00 USD');
  });
});
