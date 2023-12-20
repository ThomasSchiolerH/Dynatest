import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * @Old-project-file these methods are reused from the original project
 */
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
