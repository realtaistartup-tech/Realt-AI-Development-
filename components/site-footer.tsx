export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>Realt AI helps you understand your priorities before you look at properties.</p>
        <p className="mt-1">© {new Date().getFullYear()} Realt AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
