import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/this-week', '/members', '/schedule', '/settings'] },
    sitemap: 'https://kova.app/sitemap.xml',
  }
}
