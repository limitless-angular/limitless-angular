export type ImageUrlBuilderOptions = Partial<SanityProjectDetails> & {
  baseUrl?: string;
  mediaLibraryId?: string;
  canvasId?: string;
  source?: SanityImageSource;
  bg?: string;
  dpr?: number;
  width?: number;
  height?: number;
  focalPoint?: {
    x: number;
    y: number;
  };
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  blur?: number;
  sharpen?: number;
  rect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  format?: ImageFormat;
  invert?: boolean;
  orientation?: Orientation;
  quality?: number;
  download?: boolean | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  ignoreImageParams?: boolean;
  fit?: FitMode;
  crop?: CropMode;
  saturation?: number;
  auto?: AutoMode;
  pad?: number;
  vanityName?: string;
  frame?: number;
  [key: string]: unknown;
};

export type SanityImageSource =
  | string
  | SanityReference
  | SanityAsset
  | SanityImageObject
  | SanityImageWithAssetStub;

type ImageFormat = 'jpg' | 'pjpg' | 'png' | 'webp';
type FitMode = 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min';
type CropMode =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'focalpoint'
  | 'entropy';
type AutoMode = 'format';
type Orientation = 0 | 90 | 180 | 270;

interface SanityProjectDetails {
  projectId: string;
  dataset: string;
}

interface SanityReference {
  _ref: string;
}

interface SanityAsset {
  _id?: string;
  url?: string;
  path?: string;
  assetId?: string;
  extension?: string;
  [key: string]: unknown;
}

interface SanityImageWithAssetStub {
  asset: {
    url: string;
  };
}

interface SanityImageCrop {
  _type?: string;
  left: number;
  bottom: number;
  right: number;
  top: number;
}

interface SanityImageHotspot {
  _type?: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

interface SanityImageObject {
  asset: SanityReference | SanityAsset;
  crop?: SanityImageCrop;
  hotspot?: SanityImageHotspot;
}
