export type ParamValue = string | number | boolean | Array<string | number | boolean> | [number, number];

export interface RawParam {
  vl: ParamValue;
  p: string;
  v: ParamValue;
}
export interface RawImage {
  path: string;
  media_storage: string;
}
export interface RawAd {
  account_id: string;
  account_parameters: RawParam[];
  ad_id: number;
  subject: string;
  ad_link: string;
  body_short: string | null;
  price_byn: string;
  price_usd: string;
  images: RawImage[];
  ad_parameters: RawParam[];
}

export enum AdParameters {
  Area = 'area',
  CarsCapacity = 'cars_capacity',
  CarsEngine = 'cars_engine',
  CarsGearbox = 'cars_gearbox',
  CarsType = 'cars_type',
  Сondition = 'condition',
  Coordinates = 'coordinates',
  Delivery = 'delivery_enabled',
  Floor = 'floor',
  Mileage = 'mileage',
  NAME = 'name',
  ReNumberFloors = 're_number_floors',
  RegDate = 'regdate',
  Rooms = 'rooms',
  Safedeal = 'safedeal_enabled',
  Size = 'size',
  SquareMeter = 'square_meter',
  YearBuilt = 'year_built',
}

export type ParameterMap = Partial<Record<AdParameters, any>>;

export interface IAd {
  id: string;
  title: string;
  url: string;
  img_url: string;
  region: string;
  price: string;
}

export interface IExtendedAd extends IAd {
  saller_id: string;
  saller_name: string;
  coordinates?: number[];
  parameters: ParameterMap;
}
