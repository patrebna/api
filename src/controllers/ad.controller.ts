import { type Request, type Response } from 'express';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { extractNextDataField } from 'lib/helpers/extractNextDataField';
import { type IAdDetails } from 'types';
import { mapAds } from 'lib/helpers/mapAds';
import { stripCurrencyFromPrice } from 'lib/helpers/stripCurrencyFromPrice';
import { extractCharacteristics } from 'lib/helpers/extractCharacteristics';

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount, error) => {
    console.warn(`Попытка #${retryCount} для ${error?.config?.url}`);
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
});

export async function fetchAdDetails(adId: string): Promise<IAdDetails | null> {
  const url = `https://www.kufar.by/item/${adId}`;
  const { data } = await axios.get<string>(url);
  const adData = extractNextDataField(data, 'props.initialState.adView.data');

  if (!adData?.id) {
    return null;
  }
  console.log(adData.adParams);

  const sellerProfile = extractNextDataField(data, 'props.initialState.sellerBlock.data');
  const similarAds = mapAds(data, 'props.initialState.similarAds.ads');
  const partnerAds = mapAds(data, 'props.initialState.partnerAds.ads');

  const images: string[] =
    adData?.images?.gallery?.map((imageUrl: string) => imageUrl.replace('/gallery/', '/list_thumbs_2x/')) ?? [];

  return {
    id: adData?.id,
    title: adData.title,
    price: stripCurrencyFromPrice(adData?.price),
    category: adData?.category,
    postedAt: adData?.date,
    location: adData?.region,
    seller: {
      name: sellerProfile?.name,
      avatar: sellerProfile?.profileImgUrl,
      isCompany: sellerProfile?.isCompanyAd,
      receivedCount: sellerProfile?.feedback?.receivedCount,
      overallScore: sellerProfile?.feedback?.overallScore,
    },
    images,
    characteristics: extractCharacteristics(adData?.adParams, [
      'category',
      'remunerationType',
      'carsFeatures',
      'region',
      'coordinates',
      'area',
      'deliveryEnabled',
      'safedealEnabled',
      'multiregionRegions',
      'addressTagsYandex',
      'bookingCalendar',
    ]),
    description: adData?.description,
    kufarUrl: url,
    similarAds,
    partnerAds,
  };
}

export async function getAdDetails(req: Request, res: Response): Promise<void> {
  try {
    const adId = req.params.adId as string;
    if (!adId) {
      res.status(400).json({ error: 'Отсутствует параметр adId' });
      return;
    }
    const ad = await fetchAdDetails(adId);

    if (!ad) {
      res.status(404).json({ error: 'Объявление не найдено' });
      return;
    }

    res.json(ad);
  } catch (error) {
    if (error instanceof AxiosError) {
      const { response, message, config } = error;
      res.status(response?.status ?? 400).json({
        error: message,
        details: config?.url,
      });
      console.error(`(${response?.status}) ${message} - ${config?.url}`);
    } else {
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: String(error),
      });
      console.error('Unexpected error', error);
    }
  }
}

export async function getAdDescription(req: Request, res: Response): Promise<void> {
  try {
    const adId = req.params.adId;
    if (!adId) {
      res.status(400).json({ error: 'Отсутствует параметр adId' });
      return;
    }
    const url = `https://www.kufar.by/item/${adId}`;
    const { data } = await axios.get<string>(url);
    const raw: string = extractNextDataField(data, 'props.initialState.adView.data.description');
    const description = typeof raw === 'string' ? raw.replace(/\n+/g, ' ').trim() : null;
    res.json(description ?? '');
  } catch (error) {
    if (error instanceof AxiosError) {
      const { response, message, config } = error;
      res.status(response?.status ?? 400).json({
        error: message,
        details: config?.url,
      });
      console.error(`(${response?.status}) ${message} - ${config?.url}`);
    } else {
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: String(error),
      });
      console.error('Unexpected error', error);
    }
  }
}
