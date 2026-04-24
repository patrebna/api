import { ISimilarAd } from 'types';
import { extractNextDataField } from 'lib/helpers/extractNextDataField';

export function mapAds(data: string, path: string): ISimilarAd[] {
  return (extractNextDataField(data, path) ?? [])
    .map((ad: any) => ({
      id: ad?.ad_id,
      image: ad?.images?.[0]
        ? `https://${ad.images[0].media_storage}.kufar.by/v1/list_thumbs_2x/${ad.images[0].path}`
        : null,
      title: ad?.subject,
      price: ad?.price_byn,
      postedAt: ad?.list_time,
      remunerationType: ad?.remuneration_type,
    }))
    .slice(0, 8);
}
