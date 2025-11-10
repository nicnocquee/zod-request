"use client";

import { useState } from "react";
import { useShortUrl } from "./api/url/use-short-url";

function Home() {
  const [url, setUrl] = useState<string>("");

  const { data, error, pending, shorten } = useShortUrl();

  return (
    <div className="flex items-start flex-col justify-center bg-zinc-50 font-sans dark:bg-black">
      <input
        type="url"
        placeholder="https://www.google.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="border border-gray-300 rounded-md p-2 w-full"
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={pending}
        onClick={() => {
          shorten(url);
        }}
      >
        Get Short URL
      </button>
      {data && data.shortUrl && (
        <>
          <p>Short URL: {data.shortUrl}</p>
          <p>Expire Timestamp: {data.expireTimestamp}</p>
        </>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Short URL Generator</h1>
        <Home />
      </div>
    </div>
  );
}
