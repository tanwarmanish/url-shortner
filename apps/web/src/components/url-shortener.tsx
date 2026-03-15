import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Copy, ExternalLink, Link2, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface ShortenedUrl {
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
}

const API_URL = 'http://localhost:3000';

export function UrlShortener() {
  const [url, setUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState<ShortenedUrl | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShortenedUrl(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Add protocol if missing
    let urlToShorten = url.trim();
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
        body: JSON.stringify({ url: urlToShorten }),
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
  };

  const copyToClipboard = async () => {
    if (!shortenedUrl) return;

    const fullShortUrl = `${API_URL}${shortenedUrl.shortUrl}`;
    await navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading}>
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

          {error && (
            <p className="text-sm text-destructive text-left">{error}</p>
          )}
        </form>

        {shortenedUrl && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Short URL</p>
                <p className="text-lg font-medium truncate">
                  {API_URL}
                  {shortenedUrl.shortUrl}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className={cn(copied && 'text-green-500')}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`${API_URL}${shortenedUrl.shortUrl}`}
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
              <p className="text-sm font-mono bg-background px-2 py-1 rounded inline-block">
                {shortenedUrl.shortCode}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">Scan to open</p>
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={`${API_URL}${shortenedUrl.shortUrl}`}
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
