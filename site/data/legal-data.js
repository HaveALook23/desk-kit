/**
 * Public legal / rate constants. UI must show lastVerified + source URL.
 * Update this file when official pages change — do not scatter magic numbers.
 */
export const LEGAL_DATA = {
  lastVerified: '26/08/2026',
  timezone: 'Asia/Hong_Kong',
  tobacco: {
    cigaretteDutyPer1000: 3306,
    cigarDutyPerKg: 4258,
    chinesePreparedDutyPerKg: 811,
    otherManufacturedDutyPerKg: 4005,
    longCigaretteMmThreshold: 90,
    maxFineHkd: 2_000_000,
    maxImprisonmentYears: 7,
    nonTobaccoMaxFineHkd: 1_000_000,
    nonTobaccoMaxImprisonmentYears: 2,
    compoundableFixedFineHkd: 5000,
    compoundingDutyMultiplier: 5,
    compoundingMultiplierSourceNote:
      '5 倍應課稅款見 18/03/2024 政府新聞公報 Compounding Scheme；2025 年修例公開文本只寫明有代價地不予檢控由 $2,000 調至 $5,000，未再覆述 5 倍公式。',
    allowance: {
      minAge: 18,
      cigarettes: 19,
      cigarCountOrGrams: { oneCigar: 1, maxGramsIfMoreThanOne: 25 },
      otherManufacturedGrams: 25,
      logic: 'OR',
    },
    effectiveDutyRatesNote: '稅率以香港海關「種類及稅率」頁為準。',
    sources: {
      rates:
        'https://www.customs.gov.hk/tc/service-enforcement-information/trade-facilitation/dutiable-commodities/types-and-duty-rates/index.html',
      concession:
        'https://www.customs.gov.hk/tc/service-enforcement-information/passenger-clearance/duty-free-concessions/index.html',
      penalty:
        'https://www.customs.gov.hk/tc/service-enforcement-information/passenger-clearance/faqs/common-charges-penalties/index.html',
      compounding2024:
        'https://www.info.gov.hk/gia/general/202403/18/P2024031800529.htm',
      compounding2025:
        'https://www.info.gov.hk/gia/general/202509/25/P2025092300405.htm',
    },
  },
  pension: {
    nps: {
      maxCommutationPct: 50,
      commutationStep: 5,
      categoryAFactor: 1 / 675,
      categoryBPre1987Factor: 1 / 800,
      categoryBFrom1987Factor: 1 / 675,
      categoryBSplitDate: '1987-04-01',
      shortServiceGratuityMultiplier: 7,
      minQualifyingYearsForPension: 10,
    },
    ops: {
      maxCommutationPct: 25,
      commutationStep: 5,
      categoryAFactor: 1 / 600,
      categoryBFirst25YearsFactor: 1 / 800,
      categoryBAfter25YearsFactor: 1 / 600,
      categoryBFirst25YearsMonths: 300,
      shortServiceGratuityMultiplier: 7,
      minQualifyingYearsForPension: 10,
    },
    commutationFactor: 14,
    maxPensionFractionOfAnnualEmoluments: 2 / 3,
    sources: {
      calculator:
        'https://www.csb.gov.hk/english/admin/retirement/185.html',
      faq: 'https://www.csb.gov.hk/english/admin/retirement/2541.html',
      npsGuide:
        'https://www.csb.gov.hk/english/admin/retirement/files/guide_nps.doc',
      opsGuide:
        'https://www.csb.gov.hk/english/admin/retirement/files/guide_ops.doc',
      treasuryFaq: 'https://www.try.gov.hk/internet/ehpens_faq.html',
    },
  },
};
