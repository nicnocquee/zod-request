"use client";

import { useCallback, useReducer, useState } from "react";

export function useShortUrl() {
  const [data, dispatchData] = useReducer(
    (
      state: { shortUrl: string; expireTimestamp: number },
      action: { shortUrl: string; expireTimestamp: number }
    ) => {
      return action;
    },
    { shortUrl: "", expireTimestamp: 0 }
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useReducer(
    (state: boolean, action: boolean) => {
      return action;
    },
    false
  );

  const shorten = useCallback(async (url: string) => {
    if (!url || url.trim() === "") return;
    setError(null);
    dispatchData({ shortUrl: "", expireTimestamp: 0 });
    setPending(true);
    const response = await fetch("/api/url", {
      method: "POST",
      body: JSON.stringify({ url }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const responseErrorData = await response.json();
      setError(responseErrorData.error);
      setPending(false);
      return;
    }
    const data = await response.json();
    dispatchData({
      shortUrl: data.data.shortUrl,
      expireTimestamp: data.data.expireTimestamp,
    });
    setPending(false);
  }, []);

  return { data, error, pending, shorten };
}
