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
  cspf: {
    sdscRate: 0.025,
    gvcVestYears: 10,
    gmcNote: '政府強制性供款為有關入息 5%，受限於強積金有關入息上限；其餘為政府自願性供款。有關入息不一定等於實任基本薪金。',
    schedules: {
      legacy: [
        { min: 0, max: 3, rate: 0.05, label: '3 年以下' },
        { min: 3, max: 15, rate: 0.15, label: '3 年至 15 年以下' },
        { min: 15, max: 20, rate: 0.17, label: '15 年至 20 年以下' },
        { min: 20, max: 25, rate: 0.2, label: '20 年至 25 年以下' },
        { min: 25, max: 30, rate: 0.22, label: '25 年至 30 年以下' },
        { min: 30, max: null, rate: 0.25, label: '30 年或以上' },
      ],
      extended: [
        { min: 0, max: 3, rate: 0.05, label: '3 年以下' },
        { min: 3, max: 18, rate: 0.15, label: '3 年至 18 年以下' },
        { min: 18, max: 24, rate: 0.17, label: '18 年至 24 年以下' },
        { min: 24, max: 30, rate: 0.2, label: '24 年至 30 年以下' },
        { min: 30, max: 35, rate: 0.22, label: '30 年至 35 年以下' },
        { min: 35, max: null, rate: 0.25, label: '35 年或以上' },
      ],
    },
    schemes2026: [
      { name: '滙豐強積金智選計劃', url: 'https://www.hsbc.com.hk', hotline: '3128 0033' },
      { name: '宏利環球精選（強積金）計劃', url: 'https://www.manulife.com.hk', hotline: '2108 1148' },
      { name: '永明彩虹強積金計劃', url: 'https://www.sunlife.com.hk', hotline: '3183 1888' },
    ],
    schemesBefore2026: [
      { name: '友邦強積金優選計劃', url: 'https://www.aia.com.hk', hotline: '2200 6128' },
      { name: '恒生強積金–智選計劃', url: 'https://www.hangseng.com/zh-hk/e-services/e-mpf/', hotline: '2269 2269' },
      { name: 'BCT強積金–明智之選', url: 'https://www.bcthk.com/zh/our-products/bct-S800-Smart-Simple', hotline: '2298 9393' },
      { name: 'BCT積金之選', url: 'https://www.bcthk.com', hotline: '2298 9393' },
      { name: '中銀保誠簡易強積金計劃', url: 'https://www.bocpt.com', hotline: '2280 8602' },
    ],
    sources: {
      overview: 'https://www.csb.gov.hk/english/admin/retirement/cspf/418.html',
      featuresEn: 'https://www.csb.gov.hk/english/admin/retirement/421.html',
      featuresTc: 'https://www.csb.gov.hk/tc_chi/admin/retirement/421.html',
      contributions: 'https://www.csb.gov.hk/english/admin/retirement/cspf/cspfcorner/cspfquestion/2871.html',
      vesting: 'https://www.csb.gov.hk/tc_chi/admin/retirement/cspf/cspfcorner/cspfquestion/2872.html',
      schemes: 'https://www.csb.gov.hk/tc_chi/admin/retirement/cspf/cspfcorner/cspfcontact/2863.html',
      mpfaLinks: 'https://www.csb.gov.hk/tc_chi/admin/retirement/cspf/cspfcorner/cspfusefullink/2874.html',
      mpfaPlatform: 'https://mfp.mpfa.org.hk/tch/mpp_selection.jsp',
      trusteeCompare: 'https://tscplatform.mpfa.org.hk/scp/tch/index.jsp',
    },
  },
};
