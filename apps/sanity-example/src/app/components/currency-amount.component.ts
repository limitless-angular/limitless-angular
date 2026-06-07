import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  type ProviderToken,
} from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';
import { type Request as ExpressRequest } from 'express';

import { REQUEST } from '../../server.tokens';

const NETLIFY_REQUEST = 'netlify.request' as unknown as ProviderToken<Request>;

// FIXME: request token isn't injected with `ng serve` see: https://github.com/angular/angular-cli/issues/26323
const getLanguagesFn = () => {
  const platformId = inject(PLATFORM_ID);
  const expressRequest = inject<ExpressRequest>(REQUEST, { optional: true });
  const netlifyRequest = inject<Request>(NETLIFY_REQUEST, { optional: true });

  return () => {
    if (isPlatformServer(platformId) && (expressRequest || netlifyRequest)) {
      const acceptLanguageHeader = expressRequest?.headers['accept-language'];
      const expressAcceptLanguage = Array.isArray(acceptLanguageHeader)
        ? acceptLanguageHeader.join(',')
        : acceptLanguageHeader;
      const acceptLanguage =
        expressAcceptLanguage ?? netlifyRequest?.headers.get('accept-language');

      if (acceptLanguage) {
        return acceptLanguage
          .split(',')
          .map((lang) => lang.split(';')[0].trim().toUpperCase());
      }
    } else if (
      isPlatformBrowser(platformId) &&
      typeof navigator !== 'undefined' &&
      Array.isArray(navigator.languages)
    ) {
      return navigator.languages.map((lang: string) => lang.toUpperCase());
    }

    return ['ES'];
  };
};

export interface CurrencyAmountDef {
  _type: 'currencyAmount';
  currency: string;
  amount: number;
}

interface CurrencySnapshotValue {
  flag: string;
  currency: string;
  rate: number;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'currency-amount',
  standalone: true,
  template: `
    @if (currency(); as curr) {
      {{ value().amount }} {{ value().currency }}
      <span [style.background]="'#eee'">
        (~ {{ (curr.rate * value().amount).toFixed(2) }} {{ curr.currency }}
        {{ curr.flag }})
      </span>
    } @else {
      {{ value().amount }} {{ value().currency }}
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyAmountComponent extends PortableTextTypeComponent<CurrencyAmountDef> {
  private readonly languages = getLanguagesFn()();

  private withCurrency = computed(() =>
    this.languages.find((lang) => lang in snapshot),
  );

  currency = computed(() => {
    const currencyCode = this.withCurrency();
    return currencyCode ? snapshot[currencyCode] : undefined;
  });
}

/**
 * Just a snapshot in time, don't use this for anything
 */
const snapshot: Record<string, CurrencySnapshotValue> = {
  AD: { flag: '🇦🇩', currency: 'EUR', rate: 0.879428 },
  AE: { flag: '🇦🇪', currency: 'AED', rate: 3.670509 },
  AF: { flag: '🇦🇫', currency: 'AFN', rate: 105.457582 },
  AG: { flag: '🇦🇬', currency: 'XCD', rate: 2.701017 },
  AI: { flag: '🇦🇮', currency: 'XCD', rate: 2.701017 },
  AL: { flag: '🇦🇱', currency: 'ALL', rate: 107.184626 },
  AM: { flag: '🇦🇲', currency: 'AMD', rate: 482.308839 },
  AO: { flag: '🇦🇴', currency: 'AOA', rate: 534.205705 },
  AR: { flag: '🇦🇷', currency: 'ARS', rate: 103.440786 },
  AS: { flag: '🇦🇸', currency: 'EUR', rate: 0.879428 },
  AT: { flag: '🇦🇹', currency: 'EUR', rate: 0.879428 },
  AU: { flag: '🇦🇺', currency: 'AUD', rate: 1.386631 },
  AW: { flag: '🇦🇼', currency: 'ANG', rate: 1.801544 },
  AX: { flag: '🇦🇽', currency: 'EUR', rate: 0.879428 },
  AZ: { flag: '🇦🇿', currency: 'AZN', rate: 1.698531 },
  BA: { flag: '🇧🇦', currency: 'BAM', rate: 1.723603 },
  BB: { flag: '🇧🇧', currency: 'BBD', rate: 1.999171 },
  BD: { flag: '🇧🇩', currency: 'BDT', rate: 85.896826 },
  BE: { flag: '🇧🇪', currency: 'EUR', rate: 0.879428 },
  BF: { flag: '🇧🇫', currency: 'XOF', rate: 576.513956 },
  BG: { flag: '🇧🇬', currency: 'BGN', rate: 1.720308 },
  BH: { flag: '🇧🇭', currency: 'BHD', rate: 0.377398 },
  BI: { flag: '🇧🇮', currency: 'BIF', rate: 1998.466669 },
  BJ: { flag: '🇧🇯', currency: 'XOF', rate: 576.513956 },
  BL: { flag: '🇧🇱', currency: 'EUR', rate: 0.879428 },
  BM: { flag: '🇧🇲', currency: 'BMD', rate: 0.99994 },
  BN: { flag: '🇧🇳', currency: 'BND', rate: 1.352127 },
  BO: { flag: '🇧🇴', currency: 'BOB', rate: 6.87981 },
  BR: { flag: '🇧🇷', currency: 'BRL', rate: 5.565261 },
  BS: { flag: '🇧🇸', currency: 'BSD', rate: 0.999704 },
  BT: { flag: '🇧🇹', currency: 'INR', rate: 73.762797 },
  BV: { flag: '🇧🇻', currency: 'NOK', rate: 8.765649 },
  BW: { flag: '🇧🇼', currency: 'BWP', rate: 11.617826 },
  BZ: { flag: '🇧🇿', currency: 'BZD', rate: 2.014251 },
  CA: { flag: '🇨🇦', currency: 'CAD', rate: 1.257282 },
  CC: { flag: '🇨🇨', currency: 'AUD', rate: 1.386631 },
  CD: { flag: '🇨🇩', currency: 'CDF', rate: 2004.501987 },
  CF: { flag: '🇨🇫', currency: 'XAF', rate: 576.513877 },
  CG: { flag: '🇨🇬', currency: 'XAF', rate: 576.513877 },
  CH: { flag: '🇨🇭', currency: 'CHF', rate: 0.92356 },
  CI: { flag: '🇨🇮', currency: 'XOF', rate: 576.513956 },
  CK: { flag: '🇨🇰', currency: 'NZD', rate: 1.473513 },
  CL: { flag: '🇨🇱', currency: 'CLP', rate: 827.631981 },
  CM: { flag: '🇨🇲', currency: 'XAF', rate: 576.513877 },
  CN: { flag: '🇨🇳', currency: 'CNY', rate: 6.369804 },
  CO: { flag: '🇨🇴', currency: 'COP', rate: 4036.967078 },
  CR: { flag: '🇨🇷', currency: 'CRC', rate: 641.164635 },
  CU: { flag: '🇨🇺', currency: 'CUP', rate: 25.730751 },
  CV: { flag: '🇨🇻', currency: 'CVE', rate: 98.027048 },
  CX: { flag: '🇨🇽', currency: 'AUD', rate: 1.386631 },
  CZ: { flag: '🇨🇿', currency: 'CZK', rate: 21.456661 },
  DE: { flag: '🇩🇪', currency: 'EUR', rate: 0.879428 },
  DJ: { flag: '🇩🇯', currency: 'DJF', rate: 177.863705 },
  DK: { flag: '🇩🇰', currency: 'DKK', rate: 6.542304 },
  DM: { flag: '🇩🇲', currency: 'XCD', rate: 2.701017 },
  DO: { flag: '🇩🇴', currency: 'DOP', rate: 57.588082 },
  DZ: { flag: '🇩🇿', currency: 'DZD', rate: 139.49189 },
  EG: { flag: '🇪🇬', currency: 'EGP', rate: 15.698314 },
  EH: { flag: '🇪🇭', currency: 'MAD', rate: 9.255006 },
  ER: { flag: '🇪🇷', currency: 'ETB', rate: 49.579387 },
  ES: { flag: '🇪🇸', currency: 'EUR', rate: 0.879428 },
  ET: { flag: '🇪🇹', currency: 'ETB', rate: 49.579387 },
  FI: { flag: '🇫🇮', currency: 'EUR', rate: 0.879428 },
  FJ: { flag: '🇫🇯', currency: 'FJD', rate: 2.124592 },
  FK: { flag: '🇫🇰', currency: 'FKP', rate: 0.733525 },
  FO: { flag: '🇫🇴', currency: 'DKK', rate: 6.542304 },
  FR: { flag: '🇫🇷', currency: 'EUR', rate: 0.879428 },
  GA: { flag: '🇬🇦', currency: 'XAF', rate: 576.513877 },
  GB: { flag: '🇬🇧', currency: 'GBP', rate: 0.733308 },
  GD: { flag: '🇬🇩', currency: 'XCD', rate: 2.701017 },
  GE: { flag: '🇬🇪', currency: 'GEL', rate: 3.082704 },
  GF: { flag: '🇬🇫', currency: 'EUR', rate: 0.879428 },
  GG: { flag: '🇬🇬', currency: 'GGP', rate: 0.733218 },
  GH: { flag: '🇬🇭', currency: 'GHS', rate: 6.169922 },
  GI: { flag: '🇬🇮', currency: 'GIP', rate: 0.733314 },
  GL: { flag: '🇬🇱', currency: 'DKK', rate: 6.542304 },
  GM: { flag: '🇬🇲', currency: 'GMD', rate: 52.835519 },
  GN: { flag: '🇬🇳', currency: 'GNF', rate: 9096.796426 },
  GP: { flag: '🇬🇵', currency: 'EUR', rate: 0.879428 },
  GQ: { flag: '🇬🇶', currency: 'XAF', rate: 576.513877 },
  GR: { flag: '🇬🇷', currency: 'EUR', rate: 0.879428 },
  GS: { flag: '🇬🇸', currency: 'GBP', rate: 0.733308 },
  GT: { flag: '🇬🇹', currency: 'GTQ', rate: 7.7106 },
  GW: { flag: '🇬🇼', currency: 'XOF', rate: 576.513956 },
  GY: { flag: '🇬🇾', currency: 'GYD', rate: 209.028352 },
  HK: { flag: '🇭🇰', currency: 'HKD', rate: 7.790894 },
  HM: { flag: '🇭🇲', currency: 'AUD', rate: 1.386631 },
  HN: { flag: '🇭🇳', currency: 'HNL', rate: 24.45758 },
  HR: { flag: '🇭🇷', currency: 'HRK', rate: 6.614072 },
  HT: { flag: '🇭🇹', currency: 'HTG', rate: 103.236208 },
  HU: { flag: '🇭🇺', currency: 'HUF', rate: 313.677546 },
  ID: { flag: '🇮🇩', currency: 'IDR', rate: 14277.716563 },
  IE: { flag: '🇮🇪', currency: 'EUR', rate: 0.879428 },
  IL: { flag: '🇮🇱', currency: 'ILS', rate: 3.115951 },
  IM: { flag: '🇮🇲', currency: 'GBP', rate: 0.733308 },
  IN: { flag: '🇮🇳', currency: 'INR', rate: 73.762797 },
  IQ: { flag: '🇮🇶', currency: 'IQD', rate: 1459.909443 },
  IR: { flag: '🇮🇷', currency: 'IRR', rate: 42218.437072 },
  IS: { flag: '🇮🇸', currency: 'ISK', rate: 129.204095 },
  IT: { flag: '🇮🇹', currency: 'EUR', rate: 0.879428 },
  JE: { flag: '🇯🇪', currency: 'GBP', rate: 0.733308 },
  JM: { flag: '🇯🇲', currency: 'JMD', rate: 154.164956 },
  JO: { flag: '🇯🇴', currency: 'JOD', rate: 0.70895 },
  JP: { flag: '🇯🇵', currency: 'JPY', rate: 115.232254 },
  KE: { flag: '🇰🇪', currency: 'KES', rate: 113.265475 },
  KG: { flag: '🇰🇬', currency: 'KGS', rate: 84.739786 },
  KH: { flag: '🇰🇭', currency: 'KHR', rate: 4071.613838 },
  KI: { flag: '🇰🇮', currency: 'AUD', rate: 1.386631 },
  KM: { flag: '🇰🇲', currency: 'KMF', rate: 433.30185 },
  KN: { flag: '🇰🇳', currency: 'XCD', rate: 2.701017 },
  KP: { flag: '🇰🇵', currency: 'KPW', rate: 899.328502 },
  KR: { flag: '🇰🇷', currency: 'KRW', rate: 1188.158584 },
  KW: { flag: '🇰🇼', currency: 'KWD', rate: 0.303165 },
  KY: { flag: '🇰🇾', currency: 'KYD', rate: 0.833045 },
  KZ: { flag: '🇰🇿', currency: 'KZT', rate: 434.984596 },
  LA: { flag: '🇱🇦', currency: 'LAK', rate: 11271.573551 },
  LB: { flag: '🇱🇧', currency: 'LBP', rate: 1512.86911 },
  LC: { flag: '🇱🇨', currency: 'XCD', rate: 2.701017 },
  LI: { flag: '🇱🇮', currency: 'CHF', rate: 0.92356 },
  LK: { flag: '🇱🇰', currency: 'LKR', rate: 202.690445 },
  LR: { flag: '🇱🇷', currency: 'LRD', rate: 148.389662 },
  LS: { flag: '🇱🇸', currency: 'LSL', rate: 15.623427 },
  LU: { flag: '🇱🇺', currency: 'EUR', rate: 0.879428 },
  LY: { flag: '🇱🇾', currency: 'LYD', rate: 4.590183 },
  MA: { flag: '🇲🇦', currency: 'MAD', rate: 9.255006 },
  MC: { flag: '🇲🇨', currency: 'EUR', rate: 0.879428 },
  MD: { flag: '🇲🇩', currency: 'MDL', rate: 17.919316 },
  ME: { flag: '🇲🇪', currency: 'EUR', rate: 0.879428 },
  MF: { flag: '🇲🇫', currency: 'ANG', rate: 1.801544 },
  MG: { flag: '🇲🇬', currency: 'MGA', rate: 3971.376644 },
  MK: { flag: '🇲🇰', currency: 'MKD', rate: 54.159482 },
  ML: { flag: '🇲🇱', currency: 'XOF', rate: 576.513956 },
  MM: { flag: '🇲🇲', currency: 'MMK', rate: 1776.381082 },
  MN: { flag: '🇲🇳', currency: 'MNT', rate: 2856.547565 },
  MO: { flag: '🇲🇴', currency: 'MOP', rate: 8.023872 },
  MQ: { flag: '🇲🇶', currency: 'EUR', rate: 0.879428 },
  MS: { flag: '🇲🇸', currency: 'XCD', rate: 2.701017 },
  MU: { flag: '🇲🇺', currency: 'MUR', rate: 43.823574 },
  MV: { flag: '🇲🇻', currency: 'MVR', rate: 15.438917 },
  MW: { flag: '🇲🇼', currency: 'MWK', rate: 813.076218 },
  MX: { flag: '🇲🇽', currency: 'MXN', rate: 20.372189 },
  MY: { flag: '🇲🇾', currency: 'MYR', rate: 4.185751 },
  MZ: { flag: '🇲🇿', currency: 'MZN', rate: 63.796128 },
  NA: { flag: '🇳🇦', currency: 'NAD', rate: 15.528589 },
  NC: { flag: '🇳🇨', currency: 'XPF', rate: 104.880296 },
  NE: { flag: '🇳🇪', currency: 'XOF', rate: 576.513956 },
  NF: { flag: '🇳🇫', currency: 'AUD', rate: 1.386631 },
  NG: { flag: '🇳🇬', currency: 'NGN', rate: 413.292007 },
  NI: { flag: '🇳🇮', currency: 'NIO', rate: 35.380823 },
  NL: { flag: '🇳🇱', currency: 'EUR', rate: 0.879428 },
  NO: { flag: '🇳🇴', currency: 'NOK', rate: 8.765649 },
  NP: { flag: '🇳🇵', currency: 'NPR', rate: 118.127544 },
  NR: { flag: '🇳🇷', currency: 'AUD', rate: 1.386631 },
  NU: { flag: '🇳🇺', currency: 'NZD', rate: 1.473513 },
  NZ: { flag: '🇳🇿', currency: 'NZD', rate: 1.473513 },
  OM: { flag: '🇴🇲', currency: 'OMR', rate: 0.385317 },
  PA: { flag: '🇵🇦', currency: 'PAB', rate: 0.999395 },
  PE: { flag: '🇵🇪', currency: 'PEN', rate: 3.90621 },
  PF: { flag: '🇵🇫', currency: 'XPF', rate: 104.880296 },
  PG: { flag: '🇵🇬', currency: 'PGK', rate: 3.508148 },
  PH: { flag: '🇵🇭', currency: 'PHP', rate: 51.034302 },
  PK: { flag: '🇵🇰', currency: 'PKR', rate: 176.516726 },
  PL: { flag: '🇵🇱', currency: 'PLN', rate: 3.989182 },
  PM: { flag: '🇵🇲', currency: 'EUR', rate: 0.879428 },
  PN: { flag: '🇵🇳', currency: 'NZD', rate: 1.473513 },
  PS: { flag: '🇵🇸', currency: 'JOD', rate: 0.70895 },
  PT: { flag: '🇵🇹', currency: 'EUR', rate: 0.879428 },
  PY: { flag: '🇵🇾', currency: 'PYG', rate: 6934.511334 },
  QA: { flag: '🇶🇦', currency: 'QAR', rate: 3.638712 },
  RE: { flag: '🇷🇪', currency: 'EUR', rate: 0.879428 },
  RO: { flag: '🇷🇴', currency: 'RON', rate: 4.346365 },
  RS: { flag: '🇷🇸', currency: 'RSD', rate: 103.383672 },
  RU: { flag: '🇷🇺', currency: 'RUB', rate: 74.452973 },
  RW: { flag: '🇷🇼', currency: 'RWF', rate: 1025.118306 },
  SA: { flag: '🇸🇦', currency: 'SAR', rate: 3.751513 },
  SB: { flag: '🇸🇧', currency: 'SBD', rate: 8.075467 },
  SC: { flag: '🇸🇨', currency: 'SCR', rate: 14.231278 },
  SD: { flag: '🇸🇩', currency: 'SDG', rate: 437.1739 },
  SE: { flag: '🇸🇪', currency: 'SEK', rate: 9.030481 },
  SG: { flag: '🇸🇬', currency: 'SGD', rate: 1.349307 },
  SH: { flag: '🇸🇭', currency: 'GBP', rate: 0.733308 },
  SI: { flag: '🇸🇮', currency: 'EUR', rate: 0.879428 },
  SJ: { flag: '🇸🇯', currency: 'NOK', rate: 8.765649 },
  SL: { flag: '🇸🇱', currency: 'SLL', rate: 11337.524974 },
  SM: { flag: '🇸🇲', currency: 'EUR', rate: 0.879428 },
  SN: { flag: '🇸🇳', currency: 'XOF', rate: 576.513956 },
  SO: { flag: '🇸🇴', currency: 'SOS', rate: 581.289628 },
  SR: { flag: '🇸🇷', currency: 'SRD', rate: 21.217253 },
  ST: { flag: '🇸🇹', currency: 'STD', rate: 21278.282153 },
  SV: { flag: '🇸🇻', currency: 'SVC', rate: 8.742406 },
  SY: { flag: '🇸🇾', currency: 'SYP', rate: 2510.123912 },
  SZ: { flag: '🇸🇿', currency: 'SZL', rate: 15.623297 },
  TD: { flag: '🇹🇩', currency: 'XAF', rate: 576.513877 },
  TF: { flag: '🇹🇫', currency: 'EUR', rate: 0.879428 },
  TG: { flag: '🇹🇬', currency: 'XOF', rate: 576.513956 },
  TH: { flag: '🇹🇭', currency: 'THB', rate: 33.268561 },
  TJ: { flag: '🇹🇯', currency: 'TJS', rate: 11.280423 },
  TK: { flag: '🇹🇰', currency: 'NZD', rate: 1.473513 },
  TM: { flag: '🇹🇲', currency: 'TMT', rate: 3.497363 },
  TN: { flag: '🇹🇳', currency: 'TND', rate: 2.878461 },
  TO: { flag: '🇹🇴', currency: 'TOP', rate: 2.282774 },
  TR: { flag: '🇹🇷', currency: 'TRY', rate: 13.759517 },
  TT: { flag: '🇹🇹', currency: 'TTD', rate: 6.781753 },
  TV: { flag: '🇹🇻', currency: 'AUD', rate: 1.386631 },
  TW: { flag: '🇹🇼', currency: 'TWD', rate: 27.655737 },
  TZ: { flag: '🇹🇿', currency: 'TZS', rate: 2298.282318 },
  UA: { flag: '🇺🇦', currency: 'UAH', rate: 27.508699 },
  UG: { flag: '🇺🇬', currency: 'UGX', rate: 3526.801242 },
  UY: { flag: '🇺🇾', currency: 'UYU', rate: 44.655349 },
  UZ: { flag: '🇺🇿', currency: 'UZS', rate: 10851.887304 },
  VA: { flag: '🇻🇦', currency: 'EUR', rate: 0.879428 },
  VC: { flag: '🇻🇨', currency: 'XCD', rate: 2.701017 },
  VN: { flag: '🇻🇳', currency: 'VND', rate: 22681.941729 },
  VU: { flag: '🇻🇺', currency: 'VUV', rate: 113.447726 },
  WF: { flag: '🇼🇫', currency: 'XPF', rate: 104.880296 },
  WS: { flag: '🇼🇸', currency: 'EUR', rate: 0.879428 },
  YE: { flag: '🇾🇪', currency: 'YER', rate: 250.113775 },
  YT: { flag: '🇾🇹', currency: 'EUR', rate: 0.879428 },
  ZA: { flag: '🇿🇦', currency: 'ZAR', rate: 15.502048 },
};
