import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'
import { Sidebar } from '~/components/layout/sidebar'
import { MobileNav } from '~/components/layout/mobile-nav'
import { ThemeProvider } from '~/components/theme-provider'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Expenses Tracker',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    scripts: [
      {
        // Prevent flash of unstyled content by applying theme class before render
        children: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar className="hidden md:flex" />

            <main className="flex-1 md:ml-60 p-6 pb-20 md:pb-6">
              {children}
            </main>

            <MobileNav className="md:hidden" />
          </div>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
