import {
  Check,
  Clock,
  Copy,
  FileText,
  Link2,
  Loader2,
  Lock,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { ThemeToggle } from './components/theme-toggle';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { UrlShortener } from './components/url-shortener';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000');
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

const EXPIRY_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
];

const FRONTEND_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4200';

function NoteCreatePage() {
  const [content, setContent] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    shortCode: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expiryHours }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create note');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const noteUrl = result ? `${FRONTEND_URL}/note/${result.shortCode}` : '';

  const copyUrl = async () => {
    await navigator.clipboard.writeText(noteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-surface rounded-[30px] p-6 sm:p-8 space-y-5">
      <div className="flex items-center gap-3 justify-center">
        <FileText className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Shareable Note</h2>
      </div>
      <p className="text-muted-foreground text-center">
        Write a note and share it with a link. It expires automatically.
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={3500}
              rows={8}
              className="w-full rounded-2xl bg-white/65 border border-white/50 shadow-inner shadow-slate-900/5 dark:bg-slate-900/55 dark:border-white/10 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {wordCount}/500 words · {content.length}/3500 chars
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              className="rounded-xl bg-white/65 border border-white/50 dark:bg-slate-900/55 dark:border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive text-left">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !content.trim()}
            className="h-12 rounded-2xl px-8 w-full shadow-lg shadow-slate-900/15"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Note'
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-green-500 font-medium">Note created!</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg font-medium truncate">{noteUrl}</p>
            <button
              onClick={copyUrl}
              className="p-2 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expires: {new Date(result.expiresAt).toLocaleString()}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setResult(null);
                setContent('');
              }}
            >
              Create another
            </Button>
            <Button className="rounded-2xl" asChild>
              <Link to={`/note/${result.shortCode}`}>View note</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="text-center">
        <Button variant="ghost" className="rounded-2xl" asChild>
          <Link to="/">Back to shortener</Link>
        </Button>
      </div>
    </div>
  );
}

function NoteViewPage() {
  const { noteCode = '' } = useParams();
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-found'>(
    'loading',
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!noteCode) {
      setStatus('not-found');
      return;
    }

    const fetchNote = async () => {
      try {
        const res = await fetch(
          `${API_URL}/note/${encodeURIComponent(noteCode)}`,
        );

        if (!res.ok) {
          setStatus('not-found');
          return;
        }

        const data = (await res.json()) as {
          data?: { content?: string; expiresAt?: string };
        };

        if (!data.data?.content) {
          setStatus('not-found');
          return;
        }

        setContent(data.data.content);
        setExpiresAt(data.data.expiresAt || '');
        setStatus('ok');
      } catch {
        setStatus('not-found');
      }
    };

    void fetchNote();
  }, [noteCode]);

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading') {
    return (
      <div className="glass-surface rounded-[30px] p-8 text-center space-y-2">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        <p className="text-lg font-semibold">Loading note...</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="glass-surface rounded-[30px] p-6 sm:p-8 text-center space-y-4">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Note not found</h2>
        <p className="text-muted-foreground">
          This note may have expired or never existed.
        </p>
        <Button className="rounded-2xl px-6 h-11" asChild>
          <Link to="/note">Create a note</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-surface rounded-[30px] p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">Shared Note</h2>
        </div>
        <button
          onClick={copyContent}
          className="p-2 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
          title="Copy content"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="rounded-2xl bg-white/65 border border-white/50 dark:bg-slate-900/55 dark:border-white/10 p-4 sm:p-5 whitespace-pre-wrap text-sm leading-relaxed min-h-[120px]">
        {content}
      </div>

      {expiresAt && (
        <p className="text-xs text-muted-foreground text-center">
          <Clock className="h-3 w-3 inline mr-1" />
          Expires: {new Date(expiresAt).toLocaleString()}
        </p>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link to="/note">Create a note</Link>
        </Button>
        <Button variant="ghost" className="rounded-2xl" asChild>
          <Link to="/">Back to shortener</Link>
        </Button>
      </div>
    </div>
  );
}

function ShortCodeResolverPage() {
  const { shortCode = '' } = useParams();
  const [status, setStatus] = useState<
    'checking' | 'not-found' | 'error' | 'password-required'
  >('checking');

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
          data?: { originalUrl?: string; passwordRequired?: boolean };
        };

        if (payload.data?.passwordRequired) {
          setStatus('password-required');
          return;
        }

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

  if (status === 'password-required') {
    return <UnlockPage shortCode={shortCode} />;
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

function UnlockPage({ shortCode }: { shortCode: string }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, password: pw }),
      });

      const data = (await res.json()) as {
        data?: { originalUrl?: string };
        message?: string;
      };

      if (!res.ok || !data.data?.originalUrl) {
        setError(data.message || 'Incorrect password');
        return;
      }

      window.location.replace(data.data.originalUrl);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-surface rounded-[30px] p-6 sm:p-8 text-center space-y-5">
      <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
      <h2 className="text-2xl font-bold">Password Protected</h2>
      <p className="text-muted-foreground">
        This link is locked. Enter the password to continue.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-xs mx-auto">
        <Input
          type="password"
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="h-12 rounded-2xl bg-white/65 border-white/50 shadow-inner shadow-slate-900/5 dark:bg-slate-900/55 dark:border-white/10 text-center"
          disabled={loading}
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={loading || !pw.trim()}
          className="h-12 rounded-2xl px-8 w-full shadow-lg shadow-slate-900/15"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
        </Button>
      </form>
      <Button variant="ghost" className="rounded-2xl" asChild>
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
}

function UnlockRoutePage() {
  const { shortCode = '' } = useParams();
  return <UnlockPage shortCode={shortCode} />;
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
          <div className="flex items-center gap-3">
            <Link
              to="/note"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Notes
            </Link>
            <ThemeToggle />
          </div>
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
            <Route path="/note" element={<NoteCreatePage />} />
            <Route path="/note/:noteCode" element={<NoteViewPage />} />
            <Route path="/unlock/:shortCode" element={<UnlockRoutePage />} />
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
