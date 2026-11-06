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

// Nombres de los CEDEARs y acciones más operados (lo que no esté acá se muestra solo con el ticker)
export const NOMBRES = {
  AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", GOOG: "Alphabet", AMZN: "Amazon", META: "Meta", NVDA: "NVIDIA",
  TSLA: "Tesla", NFLX: "Netflix", AMD: "AMD", INTC: "Intel", MU: "Micron", AVGO: "Broadcom", TSM: "TSMC", ASML: "ASML",
  QCOM: "Qualcomm", ORCL: "Oracle", CRM: "Salesforce", ADBE: "Adobe", IBM: "IBM", CSCO: "Cisco", PLTR: "Palantir",
  SNOW: "Snowflake", SHOP: "Shopify", UBER: "Uber", ABNB: "Airbnb", PYPL: "PayPal", SQ: "Block", XYZ: "Block",
  COIN: "Coinbase", MSTR: "Strategy", SPOT: "Spotify", NU: "Nu Holdings", MELI: "MercadoLibre", GLOB: "Globant",
  DESP: "Despegar", BABA: "Alibaba", JD: "JD.com", PDD: "PDD", BIDU: "Baidu", NIO: "NIO", XPEV: "XPeng", TCEHY: "Tencent",
  SONY: "Sony", TM: "Toyota", HMC: "Honda", SAP: "SAP", ARM: "Arm", SMCI: "Super Micro", DELL: "Dell", HPQ: "HP",
  JPM: "JPMorgan", BAC: "Bank of America", C: "Citigroup", WFC: "Wells Fargo", GS: "Goldman Sachs", MS: "Morgan Stanley",
  V: "Visa", MA: "Mastercard", AXP: "American Express", BRKB: "Berkshire Hathaway", "BRK.B": "Berkshire Hathaway",
  BLK: "BlackRock", SCHW: "Charles Schwab", HSBC: "HSBC", ITUB: "Itaú", BBD: "Bradesco", SAN: "Santander",
  KO: "Coca-Cola", PEP: "PepsiCo", MCD: "McDonald's", SBUX: "Starbucks", WMT: "Walmart", COST: "Costco", TGT: "Target",
  HD: "Home Depot", NKE: "Nike", DIS: "Disney", PG: "Procter & Gamble", JNJ: "Johnson & Johnson", PFE: "Pfizer",
  MRK: "Merck", ABBV: "AbbVie", LLY: "Eli Lilly", NVO: "Novo Nordisk", UNH: "UnitedHealth", AZN: "AstraZeneca",
  MRNA: "Moderna", BMY: "Bristol-Myers", GILD: "Gilead", AMGN: "Amgen", ABT: "Abbott", TMO: "Thermo Fisher",
  XOM: "ExxonMobil", CVX: "Chevron", SHEL: "Shell", BP: "BP", PBR: "Petrobras", VIST: "Vista Energy", OXY: "Occidental",
  SLB: "Schlumberger", HAL: "Halliburton", COP: "ConocoPhillips", VALE: "Vale", RIO: "Rio Tinto", BHP: "BHP",
  GOLD: "Barrick Gold", NEM: "Newmont", FCX: "Freeport", X: "U.S. Steel", CAT: "Caterpillar", DE: "Deere",
  BA: "Boeing", LMT: "Lockheed Martin", GE: "GE Aerospace", MMM: "3M", HON: "Honeywell", UPS: "UPS", FDX: "FedEx",
  F: "Ford", GM: "General Motors", RACE: "Ferrari", T: "AT&T", VZ: "Verizon", TMUS: "T-Mobile",
  SPY: "S&P 500 ETF", QQQ: "Nasdaq 100 ETF", DIA: "Dow Jones ETF", IWM: "Russell 2000 ETF", EEM: "Emerging Markets ETF",
  EWZ: "Brasil ETF", XLE: "Energía ETF", XLF: "Financieras ETF", GLD: "Oro ETF", SLV: "Plata ETF", ARKK: "ARK Innovation",
  IBIT: "Bitcoin ETF", ETHA: "Ether ETF", FXI: "China ETF", URA: "Uranio ETF", SMH: "Semiconductores ETF",
  // Panel argentino
  GGAL: "Grupo Galicia", YPFD: "YPF", PAMP: "Pampa Energía", BMA: "Banco Macro", BBAR: "BBVA Argentina",
  SUPV: "Supervielle", CEPU: "Central Puerto", TGSU2: "TGS", TGNO4: "TGN", TXAR: "Ternium Argentina",
  ALUA: "Aluar", LOMA: "Loma Negra", CRES: "Cresud", COME: "Comercial del Plata", EDN: "Edenor",
  TRAN: "Transener", BYMA: "BYMA", VALO: "Grupo Valores", MIRG: "Mirgor", CVH: "Cablevisión Holding",
  TECO2: "Telecom Argentina", HARG: "Holcim Argentina", IRSA: "IRSA", METR: "Metrogas", AGRO: "Agrometal",
  BHIP: "Banco Hipotecario", CAPX: "Capex", CGPA2: "Camuzzi", DGCU2: "Distribuidora de Gas Cuyana", MOLI: "Molinos",
  LEDE: "Ledesma", RICH: "Richmond", SEMI: "Molinos Juan Semino", A3: "A3 Mercados", ECOG: "Ecogas", GBAN: "Naturgy BAN",
};
