'use client';

import { useEffect, useState } from 'react';

function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function LiveLocalTime() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => setCurrentTime(formatLocalTime(new Date()));
    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span aria-label="Current local time">
      Local time {currentTime ?? '--:--:--'}
    </span>
  );
}
