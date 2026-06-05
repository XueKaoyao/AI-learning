import { JSX } from 'react';
import './globals.css';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <body className="h-full">{children}</body>
    </html>
  );
}
