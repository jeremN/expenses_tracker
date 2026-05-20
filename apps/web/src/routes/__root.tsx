import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'
import { Sidebar } from '~/components/layout/sidebar'
import { MobileNav } from '~/components/layout/mobile-nav'
import { ThemeProvider } from '~/components/theme-provider'
import { LocaleProvider, parseAcceptLanguage, type Locale } from '~/i18n'
import { Toaster } from 'sonner'
import { withServerFn } from '~/server/logger'

const getInitialLocale = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getInitialLocale', async (): Promise<Locale> => {
    const request = getRequest()
    return parseAcceptLanguage(request?.headers.get('accept-language') ?? null)
  }),
)

export const Route = createRootRoute({
  loader: async (): Promise<{ locale: Locale }> => {
    const locale = await getInitialLocale()
    return { locale }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Expenses Tracker' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { locale } = Route.useLoaderData()
  return (
    <RootDocument locale={locale}>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleProvider initial={locale}>
          <ThemeProvider>
            <div className="flex min-h-screen">
              <Sidebar className="hidden md:flex" />
              <main className="flex-1 md:ml-60 p-6 pb-20 md:pb-6">
                {children}
              </main>
              <MobileNav className="md:hidden" />
            </div>
          </ThemeProvider>
          <Toaster richColors closeButton />
        </LocaleProvider>
        <Scripts />
      </body>
    </html>
  )
}
