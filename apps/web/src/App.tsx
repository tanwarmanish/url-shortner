import { Link2 } from 'lucide-react';
import { ThemeToggle } from './components/theme-toggle';
import { UrlShortener } from './components/url-shortener';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Shortify</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Shorten your links
            </h1>
            <p className="text-lg text-muted-foreground">
              Create memorable, easy-to-share short URLs with our
              what3words-style naming.
            </p>
          </div>

          <UrlShortener />
        </div>
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Built with React, NestJS & MongoDB
        </div>
      </footer>
    </div>
  );
}

export default App;
