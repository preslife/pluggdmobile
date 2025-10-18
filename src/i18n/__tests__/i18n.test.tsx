import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, it, expect } from 'vitest';
import { getMessages, DEFAULT_LOCALE } from '..';

describe('i18n messages', () => {
  it('renders English text by default', () => {
    render(
      <IntlProvider locale={DEFAULT_LOCALE} messages={getMessages(DEFAULT_LOCALE)}>
        <span data-testid="message">
          {
            getMessages(DEFAULT_LOCALE)['store.success.heading.success']
          }
        </span>
      </IntlProvider>
    );

    expect(screen.getByTestId('message').textContent).toBe('Your order is confirmed');
  });

  it('switches to Spanish translations', () => {
    const locale = 'es-ES' as const;
    render(
      <IntlProvider locale={locale} messages={getMessages(locale)}>
        <span data-testid="message">
          {getMessages(locale)['store.success.heading.success']}
        </span>
      </IntlProvider>
    );

    expect(screen.getByTestId('message').textContent).toBe('Tu pedido está confirmado');
  });
});
