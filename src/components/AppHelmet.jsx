import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function AppHelmet({ title, location }) {
  const canonicalUrl = `${location.origin}${location.pathname}`;
  const fullTitle = `${title} | ScoreBuzz - Football Scores, Results & Fixtures`;
  const baseUrl = 'https://scorebuzz.onrender.com';

  return (
    <Helmet>
      <meta charSet="utf-8" />
      <title>{fullTitle}</title>
      
      {/* Favicon links */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/logo32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/logo16.png" />
      
      {/* Manifest and app icons */}
      <link rel="apple-touch-icon" href="/logo192.png" />
      <link rel="manifest" href="/manifest.json" crossorigin="anonymous" />
      <link rel="shortcut icon" type="image/x-icon" href="/logo512.png" />
      
      {/* Viewport and theme */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <meta name="theme-color" content="#00BFFF" />
      
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Your comprehensive source for the latest football scores, match results, team standings, and fixtures from leagues and competitions worldwide."
      />
      <meta
        name="keywords"
        content="Football, Soccer, Live Scores, Match Results, Sports Fixtures, Premier League, Championship, Laliga, Bundesliga, Serie A"
      />
      <meta name="author" content="ScoreBuzz" />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta
        property="og:description"
        content="Your comprehensive source for the latest football scores, match results, team standings, and fixtures from leagues and competitions worldwide."
      />
      <meta property="og:image" content={`${baseUrl}/logo512.png`} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta
        name="twitter:description"
        content="Your comprehensive source for the latest football scores, match results, team standings, and fixtures from leagues and competitions worldwide."
      />
      <meta name="twitter:image" content={`${baseUrl}/logo512.png`} />
      
      {/* iOS */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={fullTitle} />
      
      {/* Apple touch icons */}
      <link rel="apple-touch-icon" sizes="120x120" href="/logo120.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/logo152.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/logo180.png" />
      
      {/* Robots */}
      <meta name="robots" content="index, follow" />
      
      {/* Language alternates */}
      <link rel="alternate" href="https://scorebuzz.onrender.com" hreflang="en" />
      <link rel="alternate" href="https://scorebuzz.onrender.com" hreflang="x-default" />
      
      {/* Additional meta tags */}
      <meta name="google-adsense-account" content="ca-pub-9576945242972545" />
      <meta name="application-name" content="ScoreBuzz" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="msapplication-TileColor" content="#00ae58" />
      <meta name="msapplication-tap-highlight" content="no" />
      
      {/* Structured Data / JSON-LD (optional but recommended) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "ScoreBuzz",
          "url": baseUrl,
          "description": "Your comprehensive source for the latest football scores, match results, team standings, and fixtures from leagues and competitions worldwide.",
          "publisher": {
            "@type": "Organization",
            "name": "ScoreBuzz",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/logo512.png`
            }
          }
        })}
      </script>
    </Helmet>
  );
}