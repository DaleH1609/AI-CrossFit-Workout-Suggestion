import { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://kova.app', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://kova.app/login', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: 'https://kova.app/signup', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
  ]
}
