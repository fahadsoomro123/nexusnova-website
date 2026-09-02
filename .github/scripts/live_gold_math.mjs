export const TROY_OUNCE_GRAMS=31.1034768;
export const TOLA_GRAMS=11.6638038;

const round=(value,digits=6)=>Number(value.toFixed(digits));

export function deriveGoldPkr(xauUsd,usdPkr){
  if(!Number.isFinite(xauUsd)||xauUsd<=0)throw new Error('Invalid XAU/USD price');
  if(!Number.isFinite(usdPkr)||usdPkr<=0)throw new Error('Invalid USD/PKR rate');
  const perGram=(xauUsd*usdPkr)/TROY_OUNCE_GRAMS;
  const perTola=perGram*TOLA_GRAMS;
  return {
    per_tola_24k:round(perTola,2),
    per_10g_24k:round(perGram*10,2),
    per_gram_24k:round(perGram,2),
    per_tola_22k:round(perTola*(22/24),2),
    tola_grams:TOLA_GRAMS,
    troy_ounce_grams:TROY_OUNCE_GRAMS
  };
}
