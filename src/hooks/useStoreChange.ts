import { useState, useEffect } from 'react';

/**
 * Returns a version number that increments when the user changes the selected store
 * (for brand_manager). Use in useEffect deps to refetch data when store changes.
 */
export function useStoreChange(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener('store-changed', handler);
    return () => window.removeEventListener('store-changed', handler);
  }, []);
  return version;
}
