export interface Country {
  iso: string;
  name: string;
  dial: string;
}

/**
 * NODO7 sells from the United States but demos are requested worldwide, so no
 * dial code can be assumed. The United States leads the list because it is the
 * main market; the rest follow alphabetically.
 */
const RAW_COUNTRIES: ReadonlyArray<readonly [string, string, string]> = [
  ["US", "Estados Unidos", "1"],
  ["AF", "Afganistán", "93"],
  ["AL", "Albania", "355"],
  ["DE", "Alemania", "49"],
  ["AD", "Andorra", "376"],
  ["AO", "Angola", "244"],
  ["SA", "Arabia Saudita", "966"],
  ["DZ", "Argelia", "213"],
  ["AR", "Argentina", "54"],
  ["AM", "Armenia", "374"],
  ["AW", "Aruba", "297"],
  ["AU", "Australia", "61"],
  ["AT", "Austria", "43"],
  ["AZ", "Azerbaiyán", "994"],
  ["BS", "Bahamas", "1242"],
  ["BD", "Bangladés", "880"],
  ["BB", "Barbados", "1246"],
  ["BH", "Baréin", "973"],
  ["BE", "Bélgica", "32"],
  ["BZ", "Belice", "501"],
  ["BJ", "Benín", "229"],
  ["BY", "Bielorrusia", "375"],
  ["BO", "Bolivia", "591"],
  ["BA", "Bosnia y Herzegovina", "387"],
  ["BW", "Botsuana", "267"],
  ["BR", "Brasil", "55"],
  ["BN", "Brunéi", "673"],
  ["BG", "Bulgaria", "359"],
  ["BF", "Burkina Faso", "226"],
  ["BI", "Burundi", "257"],
  ["BT", "Bután", "975"],
  ["CV", "Cabo Verde", "238"],
  ["KH", "Camboya", "855"],
  ["CM", "Camerún", "237"],
  ["CA", "Canadá", "1"],
  ["QA", "Catar", "974"],
  ["TD", "Chad", "235"],
  ["CL", "Chile", "56"],
  ["CN", "China", "86"],
  ["CY", "Chipre", "357"],
  ["CO", "Colombia", "57"],
  ["KM", "Comoras", "269"],
  ["CG", "Congo", "242"],
  ["CD", "Congo (RDC)", "243"],
  ["KR", "Corea del Sur", "82"],
  ["CR", "Costa Rica", "506"],
  ["CI", "Costa de Marfil", "225"],
  ["HR", "Croacia", "385"],
  ["CU", "Cuba", "53"],
  ["CW", "Curazao", "599"],
  ["DK", "Dinamarca", "45"],
  ["DM", "Dominica", "1767"],
  ["EC", "Ecuador", "593"],
  ["EG", "Egipto", "20"],
  ["SV", "El Salvador", "503"],
  ["AE", "Emiratos Árabes Unidos", "971"],
  ["ER", "Eritrea", "291"],
  ["SK", "Eslovaquia", "421"],
  ["SI", "Eslovenia", "386"],
  ["ES", "España", "34"],
  ["EE", "Estonia", "372"],
  ["ET", "Etiopía", "251"],
  ["PH", "Filipinas", "63"],
  ["FI", "Finlandia", "358"],
  ["FJ", "Fiyi", "679"],
  ["FR", "Francia", "33"],
  ["GA", "Gabón", "241"],
  ["GM", "Gambia", "220"],
  ["GE", "Georgia", "995"],
  ["GH", "Ghana", "233"],
  ["GI", "Gibraltar", "350"],
  ["GD", "Granada", "1473"],
  ["GR", "Grecia", "30"],
  ["GL", "Groenlandia", "299"],
  ["GP", "Guadalupe", "590"],
  ["GT", "Guatemala", "502"],
  ["GY", "Guyana", "592"],
  ["GN", "Guinea", "224"],
  ["GQ", "Guinea Ecuatorial", "240"],
  ["HT", "Haití", "509"],
  ["HN", "Honduras", "504"],
  ["HU", "Hungría", "36"],
  ["IN", "India", "91"],
  ["ID", "Indonesia", "62"],
  ["IQ", "Irak", "964"],
  ["IR", "Irán", "98"],
  ["IE", "Irlanda", "353"],
  ["IS", "Islandia", "354"],
  ["IL", "Israel", "972"],
  ["IT", "Italia", "39"],
  ["JM", "Jamaica", "1876"],
  ["JP", "Japón", "81"],
  ["JO", "Jordania", "962"],
  ["KZ", "Kazajistán", "7"],
  ["KE", "Kenia", "254"],
  ["KG", "Kirguistán", "996"],
  ["KW", "Kuwait", "965"],
  ["LA", "Laos", "856"],
  ["LS", "Lesoto", "266"],
  ["LV", "Letonia", "371"],
  ["LB", "Líbano", "961"],
  ["LR", "Liberia", "231"],
  ["LY", "Libia", "218"],
  ["LI", "Liechtenstein", "423"],
  ["LT", "Lituania", "370"],
  ["LU", "Luxemburgo", "352"],
  ["MK", "Macedonia del Norte", "389"],
  ["MG", "Madagascar", "261"],
  ["MY", "Malasia", "60"],
  ["MW", "Malaui", "265"],
  ["MV", "Maldivas", "960"],
  ["ML", "Malí", "223"],
  ["MT", "Malta", "356"],
  ["MA", "Marruecos", "212"],
  ["MQ", "Martinica", "596"],
  ["MU", "Mauricio", "230"],
  ["MR", "Mauritania", "222"],
  ["MX", "México", "52"],
  ["MD", "Moldavia", "373"],
  ["MC", "Mónaco", "377"],
  ["MN", "Mongolia", "976"],
  ["ME", "Montenegro", "382"],
  ["MZ", "Mozambique", "258"],
  ["MM", "Birmania", "95"],
  ["NA", "Namibia", "264"],
  ["NP", "Nepal", "977"],
  ["NI", "Nicaragua", "505"],
  ["NE", "Níger", "227"],
  ["NG", "Nigeria", "234"],
  ["NO", "Noruega", "47"],
  ["NZ", "Nueva Zelanda", "64"],
  ["OM", "Omán", "968"],
  ["NL", "Países Bajos", "31"],
  ["PK", "Pakistán", "92"],
  ["PA", "Panamá", "507"],
  ["PG", "Papúa Nueva Guinea", "675"],
  ["PY", "Paraguay", "595"],
  ["PE", "Perú", "51"],
  ["PF", "Polinesia Francesa", "689"],
  ["PL", "Polonia", "48"],
  ["PT", "Portugal", "351"],
  ["PR", "Puerto Rico", "1787"],
  ["GB", "Reino Unido", "44"],
  ["CF", "República Centroafricana", "236"],
  ["CZ", "República Checa", "420"],
  ["DO", "República Dominicana", "1809"],
  ["RE", "Reunión", "262"],
  ["RW", "Ruanda", "250"],
  ["RO", "Rumania", "40"],
  ["RU", "Rusia", "7"],
  ["WS", "Samoa", "685"],
  ["SN", "Senegal", "221"],
  ["RS", "Serbia", "381"],
  ["SC", "Seychelles", "248"],
  ["SL", "Sierra Leona", "232"],
  ["SG", "Singapur", "65"],
  ["SY", "Siria", "963"],
  ["SO", "Somalia", "252"],
  ["LK", "Sri Lanka", "94"],
  ["ZA", "Sudáfrica", "27"],
  ["SD", "Sudán", "249"],
  ["SE", "Suecia", "46"],
  ["CH", "Suiza", "41"],
  ["SR", "Surinam", "597"],
  ["TH", "Tailandia", "66"],
  ["TZ", "Tanzania", "255"],
  ["TJ", "Tayikistán", "992"],
  ["TT", "Trinidad y Tobago", "1868"],
  ["TN", "Túnez", "216"],
  ["TM", "Turkmenistán", "993"],
  ["TR", "Turquía", "90"],
  ["UA", "Ucrania", "380"],
  ["UG", "Uganda", "256"],
  ["UY", "Uruguay", "598"],
  ["UZ", "Uzbekistán", "998"],
  ["VE", "Venezuela", "58"],
  ["VN", "Vietnam", "84"],
  ["YE", "Yemen", "967"],
  ["ZM", "Zambia", "260"],
  ["ZW", "Zimbabue", "263"],
];

export const COUNTRY_CODES: ReadonlyArray<Country> = RAW_COUNTRIES.map(
  ([iso, name, dial]) => ({ iso, name, dial }),
);

export function findCountry(iso: string): Country | undefined {
  return COUNTRY_CODES.find((country) => country.iso === iso);
}

/** Built from the regional indicator letters, so no flag has to be stored. */
export function countryFlag(iso: string): string {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

const MIN_DIGITS = 8;
const MAX_DIGITS = 15; // E.164

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Joins a dial code with whatever the visitor typed. Returns null when the
 * result cannot be a reachable number; check_number remains the real check.
 */
export function normalizePhone(
  dialCode: string,
  localNumber: string,
): string | null {
  const dial = digitsOnly(dialCode);
  if (!dial) return null;

  let local = digitsOnly(localNumber).replace(/^0+/, "");
  if (!local) return null;

  // Visitors often retype the country code they already selected.
  if (local.startsWith(dial) && local.length - dial.length >= MIN_DIGITS - 1) {
    local = local.slice(dial.length);
  }

  const full = `${dial}${local}`;
  if (full.length < MIN_DIGITS || full.length > MAX_DIGITS) return null;
  return full;
}

/** Enough digits to recognise the number, not enough to publish it. */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = digitsOnly(phone);
  if (digits.length < 6) return null;
  const country = COUNTRY_CODES.find((candidate) =>
    digits.startsWith(candidate.dial),
  );
  const dial = country?.dial ?? digits.slice(0, 2);
  const rest = digits.slice(dial.length);
  return `+${dial} ${rest.slice(0, 3)}…${digits.slice(-4)}`;
}
