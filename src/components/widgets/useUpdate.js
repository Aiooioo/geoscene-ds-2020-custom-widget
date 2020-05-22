import { useState, useCallback } from 'react';

export default function useUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
}
