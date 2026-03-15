import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Copy, ExternalLink, Link2, Loader2, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ShortenedUrl {
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
}

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000');
const FRONTEND_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4200';

interface UrlShortenerProps {
  initialUrl?: string;
  autoShortenOnMount?: boolean;
}

export function UrlShortener({
  initialUrl,
  autoShortenOnMount = false,
}: UrlShortenerProps) {
  const [url, setUrl] = useState('');
  const [useEmoji, setUseEmoji] = useState(false);
  const [password, setPassword] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState<ShortenedUrl | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastAutoShortenedUrl = useRef<string>('');

  const shortenUrl = useCallback(
    async (rawUrl: string) => {
      setError('');
      setShortenedUrl(null);

      if (!rawUrl.trim()) {
        setError('Please enter a URL');
        return;
      }

      // Add protocol if missing
      let urlToShorten = rawUrl.trim();
      if (
        !urlToShorten.startsWith('http://') &&
        !urlToShorten.startsWith('https://')
      ) {
        urlToShorten = 'https://' + urlToShorten;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/shorten`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlToShorten,
            useEmoji,
            ...(password.trim() && { password: password.trim() }),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to shorten URL');
        }

        setShortenedUrl(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [useEmoji, password],
  );

  useEffect(() => {
    if (!initialUrl) {
      return;
    }

    setUrl(initialUrl);

    if (!autoShortenOnMount || !initialUrl.trim()) {
      return;
    }

    if (lastAutoShortenedUrl.current === initialUrl.trim()) {
      return;
    }

    lastAutoShortenedUrl.current = initialUrl.trim();
    void shortenUrl(initialUrl);
  }, [autoShortenOnMount, initialUrl, shortenUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await shortenUrl(url);
  };

  const copyToClipboard = async () => {
    if (!shortenedUrl) return;

    const fullShortUrl = `${FRONTEND_URL}${shortenedUrl.shortUrl}`;
    await navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full glass-surface rounded-[30px] border-white/45">
      <CardContent className="pt-6 sm:pt-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-white/65 border-white/50 shadow-inner shadow-slate-900/5 dark:bg-slate-900/55 dark:border-white/10"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 rounded-2xl px-6 sm:px-7 shadow-lg shadow-slate-900/15"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Shortening
                </>
              ) : (
                'Shorten'
              )}
            </Button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useEmoji}
              onChange={(e) => setUseEmoji(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              Use emoji code instead of words
            </span>
          </label>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password protect (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-10 rounded-2xl bg-white/65 border-white/50 shadow-inner shadow-slate-900/5 dark:bg-slate-900/55 dark:border-white/10"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-left">{error}</p>
          )}
        </form>

        {shortenedUrl && (
          <div className="mt-6 p-4 sm:p-5 rounded-3xl bg-white/45 border border-white/45 dark:bg-slate-900/35 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Short URL</p>
                <p className="text-lg font-medium truncate">
                  {FRONTEND_URL}
                  {shortenedUrl.shortUrl}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className={cn(
                    'rounded-2xl bg-white/70 border-white/50 dark:bg-slate-900/45 dark:border-white/10',
                    copied && 'text-green-500',
                  )}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl bg-white/70 border-white/50 dark:bg-slate-900/45 dark:border-white/10"
                  asChild
                >
                  <a
                    href={`${FRONTEND_URL}${shortenedUrl.shortUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Original URL</p>
              <p className="text-sm truncate text-muted-foreground">
                {shortenedUrl.originalUrl}
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Short Code</p>
              <p className="text-sm font-mono bg-background/70 px-2 py-1 rounded-xl inline-block">
                {shortenedUrl.shortCode}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">Scan to open</p>
              <div className="bg-white p-3 rounded-2xl">
                <QRCodeSVG
                  value={`${FRONTEND_URL}${shortenedUrl.shortUrl}`}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
