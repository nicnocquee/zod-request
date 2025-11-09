"use client";

import { useActionState, useState, useTransition } from "react";
import { getShortUrlFunction } from "./server/time/get-short-url.server.function";
import { getShortUrlFormAction } from "./server/time/get-short-url.form.action";

export function HomeWithServerFunction() {
  const [url, setUrl] = useState<string>("https://www.google.com");
  const [pending, startTransition] = useTransition();
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [expireTimestamp, setExpireTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
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
          startTransition(async () => {
            const result = await getShortUrlFunction(url);
            startTransition(() => {
              if (result.success && result.data) {
                setShortUrl(result.data.shortUrl);
                setExpireTimestamp(result.data.expireTimestamp);
              } else if (result.error) {
                setError(result.error);
              }
            });
          });
        }}
      >
        Get Short URL
      </button>
      {shortUrl && <p>Short URL: {shortUrl}</p>}
      {expireTimestamp && <p>Expire Timestamp: {expireTimestamp}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}

function HomeWithFormAction() {
  const [state, formAction, pending] = useActionState(
    getShortUrlFormAction,
    null
  );
  return (
    <form action={formAction}>
      <div className="flex items-start flex-col justify-center bg-zinc-50 font-sans dark:bg-black">
        <input
          //  type="url"
          placeholder="https://www.google.com"
          name="url"
          className="border border-gray-300 rounded-md p-2 w-full"
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pending}
          type="submit"
        >
          Get Short URL
        </button>
        {state?.success && state.data && (
          <p>Short URL: {state.data.shortUrl}</p>
        )}
        {state?.success && state.data && (
          <p>Expire Timestamp: {state.data.expireTimestamp}</p>
        )}
        {state?.error && <p>Error: {state.error}</p>}
      </div>
    </form>
  );
}

export default function Home() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Server Function</h1>
        <p>This is a server function that gets a short URL from the API.</p>
        <HomeWithServerFunction />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Form Action</h1>
        <p>This is a form action that gets a short URL from the API.</p>
        <HomeWithFormAction />
      </div>
    </div>
  );
}
