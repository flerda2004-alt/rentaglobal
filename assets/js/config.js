// Configuración editable de la web.
export const CONFIG = {
  // Completar con el número de registro de Renta Global SRL como Agente Productor en la CNV.
  // Mientras esté vacío, el pie muestra el texto sin número.
  matriculaCNV: "",

  links: {
    cocosHome: "https://cocos.capital/",
    cocosAlta: "https://cocos.capital/descargar",
    cocosApp: "https://app.cocos.capital/sign-in",
    cocosFondo: (slug) => `https://cocos.capital/fondos-comunes-de-inversion/${slug}`,
  },

  // Cada cuánto se vuelve a pedir cada fuente (milisegundos)
  refresco: {
    dolares: 60_000,
    mercadoAbierto: 30_000,
    mercadoCerrado: 300_000,
    bcra: 600_000,
    riesgo: 600_000,
    snapshot: 600_000,
  },

  fuentes: {
    snapshot: "data/snapshot.json",
    dolarapi: "https://dolarapi.com/v1/dolares",
    data912: (panel) => `https://data912.com/live/${panel}`,
    bcraSerie: (id, desde, hasta) => `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/${id}?desde=${desde}&hasta=${hasta}&limit=3000`,
    riesgoUltimo: "https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo",
  },
};

// Dólares que se muestran, en este orden
export const CASAS = [
  { casa: "bolsa", nombre: "MEP", largo: "Dólar MEP (bolsa)", color: "#6bbaf3" },
  { casa: "contadoconliqui", nombre: "CCL", largo: "Contado con liquidación", color: "#8ec5da" },
  { casa: "blue", nombre: "Blue", largo: "Dólar blue", color: "#a8b8ff" },
  { casa: "oficial", nombre: "Oficial", largo: "Oficial (Banco Nación)", color: "#c9d4e6" },
  { casa: "mayorista", nombre: "Mayorista", largo: "Mayorista (A3500)", color: "#7f8da8" },
  { casa: "cripto", nombre: "Cripto", largo: "Dólar cripto (USDT)", color: "#f3bd62" },
  { casa: "tarjeta", nombre: "Tarjeta", largo: "Tarjeta / turista", color: "#ff9fb2" },
];

// Colores de los fondos: los de Cocos en azules (protagonistas), el resto en grises.
export const COLOR_FONDO = {
  "cocos-ahorro": "#6bbaf3",
  "cocos-rendimiento": "#2f8fe6",
  "cocos-pesos-plus": "#8ec5da",
  "cocos-ahorro-dolares": "#6bbaf3",
  "cocos-dolares-plus": "#8ec5da",
  "pionero-pesos-plus": "#9aa6bd",
  "super-ahorro-plus": "#5f6c87",
  "pionero-mm-dolar": "#9aa6bd",
  "superfondo-ahorro-usd": "#5f6c87",
};

// Nombres de los CEDEARs y acciones (lo que no esté acá se muestra solo con el ticker)
export const NOMBRES = {
  // CEDEARs
  AAL: "American Airlines", AAP: "Advance Auto Parts", AAPL: "Apple", ABBV: "AbbVie", ABEV: "Ambev", ABEV3: "Ambev",
  ABNB: "Airbnb", ABT: "Abbott", ACN: "Accenture", ACWI: "ETF MSCI ACWI", ADBE: "Adobe", ADGO: "Adecoagro",
  ADI: "Analog Devices", ADP: "ADP", ADS: "Adidas", AEG: "Aegon", AEM: "Agnico Eagle", AI: "C3.ai", AIG: "AIG",
  ALAB: "Astera Labs", AMAT: "Applied Materials", AMD: "AMD", AMGN: "Amgen", AMX: "América Móvil", AMZN: "Amazon",
  ANET: "Arista Networks", ANF: "Abercrombie & Fitch", ARCO: "Arcos Dorados", ARKK: "ETF ARK Innovation", ARM: "Arm",
  ASML: "ASML", ASR: "Aeropuertos del Sureste", ASTS: "AST SpaceMobile", AVGO: "Broadcom", AVY: "Avery Dennison",
  AXP: "American Express", AZN: "AstraZeneca", B: "Barrick", BA: "Boeing", BABA: "Alibaba", BAK: "Braskem", BAYN: "Bayer",
  BB: "BlackBerry", BBAS3: "Banco do Brasil", BBDC3: "Bradesco", BBD: "Bradesco", BBV: "BBVA", BCS: "Barclays", BHP: "BHP",
  BIDU: "Baidu", BIIB: "Biogen", BIOX: "Bioceres", BKNG: "Booking", BKR: "Baker Hughes", BMNR: "BitMine", BMY: "Bristol-Myers Squibb",
  BNG: "Bunge", BP: "BP", BRKB: "Berkshire Hathaway", BSBR: "Santander Brasil", BX: "Blackstone", C: "Citigroup",
  CAAP: "Corporación América", CAH: "Cardinal Health", CAT: "Caterpillar", CCJ: "Cameco", CCL: "Carnival", CDE: "Coeur Mining",
  CEG: "Constellation Energy", CIBR: "ETF Ciberseguridad", CL: "Colgate-Palmolive", CLS: "Celestica", COIN: "Coinbase",
  COP: "ConocoPhillips", COPX: "ETF Mineras de cobre", CORN: "ETF Maíz", COST: "Costco", CRM: "Salesforce", CRWD: "CrowdStrike",
  CRWV: "CoreWeave", CSCO: "Cisco", CSNA3: "CSN", CVS: "CVS Health", CVX: "Chevron", CX: "Cemex", DAL: "Delta Air Lines",
  DD: "DuPont", DE: "Deere", DECK: "Deckers", DELL: "Dell", DEO: "Diageo", DHR: "Danaher", DIA: "ETF Dow Jones", DISN: "Disney",
  DIS: "Disney", DOCU: "DocuSign", DOW: "Dow", E: "Eni", EBAY: "eBay", ECL: "Ecolab", EEM: "ETF Emergentes", EFA: "ETF Desarrollados ex EE.UU.",
  EFX: "Equifax", EMBJ: "Embraer", EQNR: "Equinor", ERIC: "Ericsson", ESGU: "ETF ESG EE.UU.", ETHA: "ETF Ether", ETSY: "Etsy",
  EWJ: "ETF Japón", EWY: "ETF Corea del Sur", EWZ: "ETF Brasil", F: "Ford", FCX: "Freeport-McMoRan", FDX: "FedEx", FISV: "Fiserv",
  FMX: "FEMSA", FSLR: "First Solar", FXI: "ETF China", GDX: "ETF Mineras de oro", GE: "GE Aerospace", GEV: "GE Vernova",
  GFI: "Gold Fields", GGB: "Gerdau", GILD: "Gilead", GLD: "ETF Oro", GLNG: "Golar LNG", GLOB: "Globant", GLW: "Corning",
  GM: "General Motors", GOOGL: "Alphabet", GPRK: "GeoPark", GRMN: "Garmin", GS: "Goldman Sachs", GSG: "ETF Materias primas",
  GSK: "GSK", GT: "Goodyear", HAL: "Halliburton", HAPV3: "Hapvida", HD: "Home Depot", HDB: "HDFC Bank", HIMS: "Hims & Hers",
  HL: "Hecla Mining", HMC: "Honda", HMY: "Harmony Gold", HOG: "Harley-Davidson", HON: "Honeywell", HOOD: "Robinhood", HPQ: "HP",
  HSBC: "HSBC", HSY: "Hershey", HUT: "Hut 8", HWM: "Howmet Aerospace", IBB: "ETF Biotecnología", IBIT: "ETF Bitcoin",
  IBKR: "Interactive Brokers", IBM: "IBM", IBN: "ICICI Bank", ICLN: "ETF Energía limpia", IEMG: "ETF Emergentes", IEUR: "ETF Europa",
  IFF: "IFF", IJH: "ETF S&P 400", ILF: "ETF Latinoamérica", INFY: "Infosys", ING: "ING", INTC: "Intel", IP: "International Paper",
  IREN: "IREN", ISRG: "Intuitive Surgical", ITA: "ETF Aeroespacial y defensa", ITUB: "Itaú", ITUB3: "Itaú", IVE: "ETF S&P 500 Value",
  IVV: "ETF S&P 500", IVW: "ETF S&P 500 Growth", IWM: "ETF Russell 2000", JD: "JD.com", JMIA: "Jumia", JNJ: "Johnson & Johnson",
  JOYY: "JOYY", JPM: "JPMorgan", KB: "KB Financial", KEP: "Korea Electric Power", KGC: "Kinross Gold", KLAC: "KLA",
  KMB: "Kimberly-Clark", KO: "Coca-Cola", KOFM: "Coca-Cola FEMSA", LAC: "Lithium Americas", LAR: "Lithium Argentina", LIN: "Linde",
  LLY: "Eli Lilly", LMT: "Lockheed Martin", LND: "BrasilAgro", LRCX: "Lam Research", LREN3: "Lojas Renner", LVS: "Las Vegas Sands",
  LYG: "Lloyds", MA: "Mastercard", MCD: "McDonald's", MDLZ: "Mondelez", MDT: "Medtronic", MELI: "MercadoLibre", META: "Meta",
  MFG: "Mizuho", MGLU3: "Magazine Luiza", MMM: "3M", MO: "Altria", MOS: "Mosaic", MP: "MP Materials", MRK: "Merck", MRNA: "Moderna",
  MRVL: "Marvell", MS: "Morgan Stanley", MSFT: "Microsoft", MSI: "Motorola Solutions", MSTR: "Strategy", MU: "Micron",
  MUFG: "Mitsubishi UFJ", MUX: "McEwen Mining", NATU3: "Natura", NBIS: "Nebius", NEE: "NextEra Energy", NEM: "Newmont",
  NFLX: "Netflix", NG: "NovaGold", NGG: "National Grid", NIO: "NIO", NKE: "Nike", NMR: "Nomura", NOKA: "Nokia", NOW: "ServiceNow",
  NTES: "NetEase", NTRA: "Natera", NU: "Nu Holdings", NUE: "Nucor", NVDA: "NVIDIA", NVO: "Novo Nordisk", NVS: "Novartis",
  NXE: "NexGen Energy", O: "Realty Income", OKLO: "Oklo", ONDS: "Ondas", ORCL: "Oracle", ORLY: "O'Reilly", OXY: "Occidental",
  PAAS: "Pan American Silver", PAC: "Aeropuertos del Pacífico", PAGS: "PagSeguro", PANW: "Palo Alto Networks", PATH: "UiPath",
  PBI: "Pitney Bowes", PBR: "Petrobras", PCAR: "PACCAR", PDD: "PDD", PEP: "PepsiCo", PETR3: "Petrobras", PFE: "Pfizer",
  PG: "Procter & Gamble", PHG: "Philips", PINS: "Pinterest", PLD: "Prologis", PLTR: "Palantir", PM: "Philip Morris", PRIO3: "PRIO",
  PSQ: "ETF Nasdaq 100 inverso", PSX: "Phillips 66", PYPL: "PayPal", QCOM: "Qualcomm", QQQ: "ETF Nasdaq 100", RACE: "Ferrari",
  RBLX: "Roblox", RENT3: "Localiza", RGTI: "Rigetti Computing", RIO: "Rio Tinto", RIOT: "Riot Platforms", RKLB: "Rocket Lab",
  ROKU: "Roku", ROST: "Ross Stores", RSP: "ETF S&P 500 equiponderado", RTX: "RTX", SAN: "Banco Santander", SAP: "SAP",
  SATL: "Satellogic", SBS: "Sabesp", SBSP3: "Sabesp", SBUX: "Starbucks", SCCO: "Southern Copper", SE: "Sea", SH: "ETF S&P 500 inverso",
  SHEL: "Shell", SHOP: "Shopify", SHW: "Sherwin-Williams", SID: "CSN", SLB: "SLB", SLV: "ETF Plata", SMH: "ETF Semiconductores",
  SNA: "Snap-on", SNAP: "Snap", SNDK: "SanDisk", SNOW: "Snowflake", SONY: "Sony", SOYB: "ETF Soja", SPCE: "Virgin Galactic",
  SPGI: "S&P Global", SPHQ: "ETF S&P 500 Quality", SPOT: "Spotify", SPXL: "ETF S&P 500 x3", SPY: "ETF S&P 500", STLA: "Stellantis",
  STNE: "StoneCo", SUZ: "Suzano", SUZB3: "Suzano", SWKS: "Skyworks", SYY: "Sysco", T: "AT&T", TCOM: "Trip.com", TEAM: "Atlassian",
  TEM: "Tempus AI", TEN: "Tenaris", TGT: "Target", TIMB: "TIM Brasil", TIMS3: "TIM Brasil", TJX: "TJX", TLN: "Talen Energy",
  TM: "Toyota", TMO: "Thermo Fisher", TMUS: "T-Mobile", TQQQ: "ETF Nasdaq 100 x3", TRIP: "Tripadvisor", TSLA: "Tesla", TSM: "TSMC",
  TTE: "TotalEnergies", TV: "Televisa", TWLO: "Twilio", TXN: "Texas Instruments", TXR: "Ternium", UAL: "United Airlines", UBER: "Uber",
  UGP: "Ultrapar", UL: "Unilever", UNH: "UnitedHealth", UNP: "Union Pacific", UPST: "Upstart", URA: "ETF Uranio",
  URBN: "Urban Outfitters", USB: "U.S. Bancorp", USO: "ETF Petróleo", V: "Visa", VALE: "Vale", VALE3: "Vale",
  VEA: "ETF Desarrollados", VIG: "ETF Dividendos crecientes", VIST: "Vista Energy", VIV: "Telefônica Brasil", VIVT3: "Telefônica Brasil",
  VOD: "Vodafone", VRSN: "VeriSign", VRTX: "Vertex", VST: "Vistra", VXX: "ETF Volatilidad (VIX)", VZ: "Verizon", WDC: "Western Digital",
  WEGE3: "WEG", WELL: "Welltower", WFC: "Wells Fargo", WMT: "Walmart", XLB: "ETF Materiales", XLC: "ETF Comunicaciones",
  XLE: "ETF Energía", XLF: "ETF Financieras", XLI: "ETF Industriales", XLK: "ETF Tecnología", XLP: "ETF Consumo básico",
  XLRE: "ETF Inmobiliario", XLU: "ETF Servicios públicos", XLV: "ETF Salud", XLY: "ETF Consumo discrecional", XME: "ETF Metales y minería",
  XOM: "ExxonMobil", XP: "XP", XPEV: "XPeng", XROX: "Xerox", XYZ: "Block", YELP: "Yelp", ZM: "Zoom",
  // Acciones argentinas
  A3: "A3 Mercados", AGRO: "Agrometal", ALUA: "Aluar", AUSO: "Autopistas del Sol", BBAR: "BBVA Argentina", BHIP: "Banco Hipotecario",
  BMA: "Banco Macro", BOLT: "Boldt", BPAT: "Banco Patagonia", BYMA: "BYMA", CADO: "Carlos Casado", CAPX: "Capex", CARC: "Carboclor",
  CECO2: "Central Costanera", CELU: "Celulosa Argentina", CEPU: "Central Puerto", CGPA2: "Camuzzi Gas Pampeana",
  COME: "Comercial del Plata", CRES: "Cresud", CTIO: "Consultatio", CVH: "Cablevisión Holding", DGCU2: "Gas Cuyana", DOME: "Domec",
  ECOG: "Ecogas", EDN: "Edenor", FERR: "Ferrum", FIPL: "Fiplasto", GAMI: "B-Gaming", GARO: "Garovaglio y Zorraquín",
  GBAN: "Naturgy BAN", GCDI: "GCDI", GCLA: "Grupo Clarín", GGAL: "Grupo Galicia", GRIM: "Grimoldi", HARG: "Holcim Argentina",
  HAVA: "Havanna", INAG: "Insumos Agroquímicos", INTR: "Introductora de Buenos Aires", INVJ: "Inversora Juramento", IRSA: "IRSA",
  LEDE: "Ledesma", LOMA: "Loma Negra", LONG: "Longvie", METR: "Metrogas", MIRG: "Mirgor", MOLA: "Molinos Agro",
  MOLI: "Molinos Río de la Plata", MORI: "Morixe", OEST: "Autopistas del Oeste", PAMP: "Pampa Energía", PATA: "Imp. y Exp. de la Patagonia",
  POLL: "Polledo", RICH: "Laboratorios Richmond", RIGO: "Rigolleau", ROSE: "Instituto Rosenbusch", SAMI: "San Miguel",
  SEMI: "Molinos Juan Semino", SUPV: "Grupo Supervielle", TECO2: "Telecom Argentina", TGNO4: "TGN", TGSU2: "TGS",
  TRAN: "Transener", TXAR: "Ternium Argentina", VALO: "Grupo Financiero Valores", YPFD: "YPF",
};
