import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import ClientWrapper from "./components/ClientWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://pointedu.com.br'),
  title: { default: 'Point', template: '%s · Point' },
  description: 'Assistente acadêmico com IA para universitários brasileiros. Tire dúvidas, organize matérias, acompanhe notas e prazos.',
  openGraph: {
    title: 'Point',
    description: 'Assistente acadêmico com IA para universitários brasileiros.',
    url: 'https://pointedu.com.br',
    siteName: 'Point',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Point' },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs synchronously before paint — prevents dark/light flash */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('pointai_tema')||'dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`
        }}/>
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ClientWrapper>
            {children}
          </ClientWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
