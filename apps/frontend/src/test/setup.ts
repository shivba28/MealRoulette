import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Skip hero panel in tests so existing tests that don't render App still behave as before.
// Tests that need to assert hero behavior can override this or clear the mock.
if (typeof localStorage !== 'undefined') {
  const getItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (key: string) => {
    if (key === 'meal-roulette-visited') return '1';
    return getItem(key);
  };
}
