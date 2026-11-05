export const ADSENSE_SCRIPT = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
export function canRequestAd(config, consent) {
  return Boolean(config && config.production === true && config.siteEnabled === true &&
    config.provider === 'adsense' && config.providerEnabled === true && config.pageEligible === true &&
    /^ca-pub-\d{16}$/.test(config.publisherId) && /^\d{5,16}$/.test(config.slot) &&
    consent?.cmpReady === true && consent?.adConsent === 'allowed' &&
    /^[A-Z]{2}$/.test(consent.country) && Array.isArray(config.countries) && config.countries.includes(consent.country));
}
