import { Link2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { ThemeToggle } from './components/theme-toggle';
import { Button } from './components/ui/button';
import { UrlShortener } from './components/url-shortener';

const API_URL =
  (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID as
  | string
  | undefined;
const ADSENSE_ERROR_SLOT = import.meta.env.VITE_ADSENSE_ERROR_SLOT as
  | string
  | undefined;

function AdsenseErrorUnit() {
  const adRef = useRef<HTMLElement | null>(null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !ADSENSE_ERROR_SLOT || hasRequestedRef.current) {
      return;
    }

    const requestAd = () => {
      if (!adRef.current || hasRequestedRef.current) {
        return;
      }

      try {
        ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ||=
          []).push({});
        hasRequestedRef.current = true;
      } catch {
        // Ignore ad-block/script timing failures to keep page UX intact.
      }
    };

    const scriptId = 'adsense-script';
    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      requestAd();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.onload = requestAd;
    document.head.appendChild(script);
  }, []);

  if (!ADSENSE_CLIENT_ID || !ADSENSE_ERROR_SLOT) {
    return null;
  }

  return (
    <div className="mt-2 rounded-2xl border border-white/35 bg-white/35 p-3 dark:border-white/10 dark:bg-slate-900/35">
      <p className="mb-2 text-xs text-muted-foreground">Sponsored</p>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_ERROR_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

function decodeRouteUrl(pathValue?: string): string {
  if (!pathValue) {
    return '';
  }

  try {
    return decodeURIComponent(pathValue).trim();
  } catch {
    return pathValue.trim();
  }
}

function RouteShortenerPage() {
  const params = useParams();
  const routeUrl = decodeRouteUrl(params['*']);

  return <UrlShortener initialUrl={routeUrl} autoShortenOnMount />;
}

const MEME_GIFS = [
  'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
  'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  'https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
  'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
];

function pickMemeGif(seed: string): string {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return MEME_GIFS[hash % MEME_GIFS.length];
}

function ShortCodeResolverPage() {
  const { shortCode = '' } = useParams();
  const [status, setStatus] = useState<'checking' | 'not-found' | 'error'>(
    'checking',
  );

  const memeGif = useMemo(
    () => pickMemeGif(shortCode || 'default'),
    [shortCode],
  );

  useEffect(() => {
    if (!shortCode) {
      setStatus('not-found');
      return;
    }

    const resolveShortCode = async () => {
      try {
        const resolveResponse = await fetch(
          `${API_URL}/resolve/${encodeURIComponent(shortCode)}`,
        );

        if (!resolveResponse.ok) {
          setStatus('not-found');
          return;
        }

        const payload = (await resolveResponse.json()) as {
          data?: { originalUrl?: string };
        };

        const destination = payload.data?.originalUrl;

        if (!destination) {
          setStatus('error');
          return;
        }

        window.location.replace(destination);
      } catch {
        setStatus('error');
      }
    };

    void resolveShortCode();
  }, [shortCode]);

  if (status === 'checking') {
    return (
      <div className="glass-surface rounded-[30px] p-8 text-center space-y-2">
        <p className="text-lg font-semibold">Finding your link...</p>
        <p className="text-sm text-muted-foreground">
          Hang tight, we are opening your destination.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-surface rounded-[30px] p-6 sm:p-7 text-center space-y-4">
      <h2 className="text-2xl font-bold">Link not found</h2>
      <p className="text-muted-foreground">
        {status === 'error'
          ? 'Could not verify this short code right now.'
          : `No URL exists for ${shortCode}.`}
      </p>
      <div className="overflow-hidden rounded-3xl border border-white/30">
        <img
          src={memeGif}
          alt="Funny meme gif"
          className="w-full max-h-80 object-cover"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        That link went on vacation. Try creating a new short URL.
      </p>
      <AdsenseErrorUnit />
      <Button className="rounded-2xl px-6 h-11" asChild>
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6 sm:py-6">
      <header className="mx-auto max-w-5xl glass-surface rounded-[28px]">
        <div className="px-5 py-4 sm:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900/90 text-white dark:bg-white dark:text-slate-900 grid place-items-center shadow-lg shadow-slate-700/20">
              <Link2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Shortify
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl py-8 sm:py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Shorten your links
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Create memorable, easy-to-share short URLs with our
              what3words-style naming.
            </p>
          </div>

          <Routes>
            <Route path="/" element={<UrlShortener />} />
            <Route path="/s" element={<UrlShortener />} />
            <Route path="/s/*" element={<RouteShortenerPage />} />
            <Route path="/shorten/*" element={<RouteShortenerPage />} />
            <Route path="/:shortCode" element={<ShortCodeResolverPage />} />
            <Route path="*" element={<UrlShortener />} />
          </Routes>
        </div>
      </main>

      {/* <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Footer Here
        </div>
      </footer> */}
    </div>
  );
}

export default App;
