import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import apiRouter from 'routes/api.routes';
import { fetchAdDetails } from 'controllers/ad.controller';
import db from 'services/mongodb.service';

const { PORT = 3000 } = process.env;
const siteUrl = 'https://patrebna.by';
const landingSourceDir = path.resolve(__dirname, '../../landing');
const landingDistDir = path.join(landingSourceDir, 'dist');
const landingDevOrigin = 'http://localhost:5173';

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(landingDistDir, { index: false }));
app.use('/api', apiRouter);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForHtml<T>(value: T): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildAdMetadata(ad: Awaited<ReturnType<typeof fetchAdDetails>>, adId: string) {
  const canonicalUrl = `${siteUrl.replace(/\/$/, '')}/ad/${adId}/`;
  const imageUrl = ad?.images?.[0] || `${siteUrl.replace(/\/$/, '')}/og-image.png`;
  const normalizedDescription = (ad?.description || `Объявление "${ad?.title ?? ''}" на Kufar.`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const title = ad ? `${ad.title} | PATREBNA` : 'Объявление | PATREBNA';

  return {
    canonicalUrl,
    imageUrl,
    normalizedDescription,
    title,
  };
}

function injectAdPageMeta(template: string, ad: Awaited<ReturnType<typeof fetchAdDetails>>, adId: string): string {
  const { canonicalUrl, imageUrl, normalizedDescription, title } = buildAdMetadata(ad, adId);
  const initialDataScript = `<script>window.__AD_DATA__=${escapeJsonForHtml(ad)};</script>`;

  const replacements: Array<[RegExp, string]> = [
    [/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`],
    [
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(normalizedDescription)}" />`,
    ],
    [/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`],
    [
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    ],
    [
      /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    ],
    [
      /<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    ],
    [
      /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    ],
    [
      /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(normalizedDescription)}" />`,
    ],
    [
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    ],
    [
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(normalizedDescription)}" />`,
    ],
  ];

  const htmlWithMeta = replacements.reduce(
    (html, [pattern, replacement]) => html.replace(pattern, replacement),
    template,
  );

  return htmlWithMeta.replace('</body>', `  ${initialDataScript}\n  </body>`);
}

async function loadLandingTemplate(): Promise<string> {
  const distIndexPath = path.join(landingDistDir, 'index.html');

  try {
    await fs.access(distIndexPath);
    return await fs.readFile(distIndexPath, 'utf-8');
  } catch {
    const sourceIndexPath = path.join(landingSourceDir, 'index.html');
    const sourceTemplate = await fs.readFile(sourceIndexPath, 'utf-8');

    return sourceTemplate.replace(
      /<script type="module" src="\/src\/main\.tsx"><\/script>/,
      [
        `<script type="module" src="${landingDevOrigin}/@vite/client"></script>`,
        `<script type="module" src="${landingDevOrigin}/src/main.tsx"></script>`,
      ].join('\n    '),
    );
  }
}

async function renderAdPage(req: express.Request, res: express.Response): Promise<void> {
  try {
    const adId = req.params.adId;

    if (!adId) {
      res.status(400).send('Отсутствует параметр adId');
      return;
    }

    const [template, ad] = await Promise.all([loadLandingTemplate(), fetchAdDetails(adId)]);

    if (!ad) {
      res.status(404).send('Объявление не найдено');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(injectAdPageMeta(template, ad, adId));
  } catch (error) {
    console.error('Не удалось отрендерить страницу объявления', error);
    res.status(500).send('Не удалось отрендерить страницу объявления');
  }
}

app.get('/ad/:adId', renderAdPage);
app.get('/ad/:adId/', renderAdPage);

app.listen(PORT, async () => {
  await db.openConnection();
  console.log(`API запущен на порту ${PORT}`);
});
