// ─── Mapeos a inglés para los prompts ──────────────────────────────────────────
const RACE_EN: Record<string, string> = {
  humano: 'human', human: 'human',
  elfo: 'elf', elf: 'elf',
  enano: 'dwarf', dwarf: 'dwarf',
  orco: 'orc', orc: 'orc',
  mediano: 'halfling', halfling: 'halfling',
  'no-muerto': 'undead', undead: 'undead',
};

const CLASS_EN: Record<string, string> = {
  guerrero: 'warrior', warrior: 'warrior',
  'ladrón': 'thief', ladron: 'thief', thief: 'thief', rogue: 'rogue',
  mago: 'wizard', wizard: 'wizard', mage: 'mage',
  'clérigo': 'cleric', clerigo: 'cleric', cleric: 'cleric',
  'bárbaro': 'barbarian', barbaro: 'barbarian', barbarian: 'barbarian',
  bardo: 'bard', bard: 'bard',
  druida: 'druid', druid: 'druid',
  monje: 'monk', monk: 'monk',
  'paladín': 'paladin', paladin: 'paladin',
  ranger: 'ranger', explorador: 'ranger',
  ninja: 'ninja', assassin: 'assassin',
  ninguna: '', none: '',
};

// ─── Seed determinista ─────────────────────────────────────────────────────────
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Cache en memoria (evita llamadas repetidas para misma raza+clase+sexo) ────
const avatarCache = new Map<string, string>();

// ─── Together AI — generación asíncrona ───────────────────────────────────────
export async function generateAvatarAI(
  race: string,
  playerClass: string,
  sex: 'M' | 'F' = 'M',
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY as string | undefined;
  if (!apiKey) return null;

  const raceKey = race.toLowerCase().trim();
  const classKey = playerClass.toLowerCase().trim();
  const raceEn = RACE_EN[raceKey] ?? raceKey;
  const classEn = CLASS_EN[classKey] ?? (classKey && classKey !== 'ninguna' && classKey !== 'none' ? classKey : '');
  const sexStr = sex === 'F' ? 'female' : 'male';

  const cacheKey = `${raceEn}-${classEn}-${sex}`;
  if (avatarCache.has(cacheKey)) return avatarCache.get(cacheKey)!;

  const classSegment = classEn ? ` ${classEn}` : '';
  const prompt =
    `fantasy RPG character portrait, ${sexStr} ${raceEn}${classSegment}, ` +
    `face close-up, digital art, high detail, dramatic lighting, no text, no watermark`;

  const seed = hashCode(cacheKey);

  try {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width: 512,
        height: 512,
        steps: 4,
        seed,
        response_format: 'b64_json',
        n: 1,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    const url = `data:image/jpeg;base64,${b64}`;
    avatarCache.set(cacheKey, url);
    return url;
  } catch {
    return null;
  }
}

// ─── SVG local — placeholder instantáneo mientras carga la IA ─────────────────

interface RaceConfig {
  bg: string;
  skin: string;
  border: string;
  ear: 'pointed' | 'round' | 'small';
  extra?: string;
}

const RACE_CONFIGS: Record<string, RaceConfig> = {
  elfo: { bg: '#c8f0c8', skin: '#e8f5e9', border: '#2e7d32', ear: 'pointed' },
  elf: { bg: '#c8f0c8', skin: '#e8f5e9', border: '#2e7d32', ear: 'pointed' },
  enano: { bg: '#ffe0b2', skin: '#d4a574', border: '#bf360c', ear: 'round',
    extra: '<path d="M52,82 Q64,90 76,82" stroke="#6d4c41" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>' },
  dwarf: { bg: '#ffe0b2', skin: '#d4a574', border: '#bf360c', ear: 'round',
    extra: '<path d="M52,82 Q64,90 76,82" stroke="#6d4c41" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>' },
  orco: { bg: '#b9f6ca', skin: '#69f0ae', border: '#1b5e20', ear: 'round',
    extra: '<polygon points="58,80 62,88 56,88" fill="#b2dfdb"/><polygon points="70,80 74,88 68,88" fill="#b2dfdb"/>' },
  orc: { bg: '#b9f6ca', skin: '#69f0ae', border: '#1b5e20', ear: 'round',
    extra: '<polygon points="58,80 62,88 56,88" fill="#b2dfdb"/><polygon points="70,80 74,88 68,88" fill="#b2dfdb"/>' },
  mediano: { bg: '#fff9c4', skin: '#ffd180', border: '#f57f17', ear: 'small' },
  halfling: { bg: '#fff9c4', skin: '#ffd180', border: '#f57f17', ear: 'small' },
  'no-muerto': { bg: '#e8eaf6', skin: '#b0bec5', border: '#311b92', ear: 'round' },
  undead: { bg: '#e8eaf6', skin: '#b0bec5', border: '#311b92', ear: 'round' },
  humano: { bg: '#e3f2fd', skin: '#ffccbc', border: '#1565c0', ear: 'round' },
  human: { bg: '#e3f2fd', skin: '#ffccbc', border: '#1565c0', ear: 'round' },
};

const DEFAULT_RACE: RaceConfig = { bg: '#f3e5f5', skin: '#ffccbc', border: '#6a1b9a', ear: 'round' };

const CLASS_ICONS: Record<string, string> = {
  guerrero: '⚔️', warrior: '⚔️',
  'ladrón': '🗡️', ladron: '🗡️', thief: '🗡️', rogue: '🗡️',
  mago: '🔮', wizard: '🔮', mage: '🔮',
  'clérigo': '✨', clerigo: '✨', cleric: '✨',
  'bárbaro': '🪓', barbaro: '🪓', barbarian: '🪓',
  bardo: '🎵', bard: '🎵',
  druida: '🍃', druid: '🍃',
  monje: '👊', monk: '👊',
  'paladín': '🛡️', paladin: '🛡️',
  ranger: '🏹', explorador: '🏹',
  ninja: '⭐', assassin: '🌙',
  ninguna: '', none: '',
};

function buildAvatarSvg(race: string, playerClass: string, sex: 'M' | 'F'): string {
  const raceKey = race.toLowerCase().trim();
  const classKey = playerClass.toLowerCase().trim();
  const rc = RACE_CONFIGS[raceKey] ?? DEFAULT_RACE;

  const earR = rc.ear === 'pointed'
    ? `<polygon points="93,52 100,35 86,48" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`
    : rc.ear === 'small'
    ? `<ellipse cx="91" cy="56" rx="5" ry="7" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`
    : `<ellipse cx="92" cy="56" rx="7" ry="9" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`;
  const earL = rc.ear === 'pointed'
    ? `<polygon points="35,52 28,35 42,48" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`
    : rc.ear === 'small'
    ? `<ellipse cx="37" cy="56" rx="5" ry="7" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`
    : `<ellipse cx="36" cy="56" rx="7" ry="9" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>`;

  const hairColor = sex === 'F' ? '#8b4513' : '#4e342e';
  const hair = sex === 'F'
    ? `<ellipse cx="64" cy="34" rx="30" ry="15" fill="${hairColor}"/>
       <rect x="34" y="34" width="9" height="35" rx="4" fill="${hairColor}"/>
       <rect x="85" y="34" width="9" height="28" rx="4" fill="${hairColor}"/>`
    : `<ellipse cx="64" cy="33" rx="29" ry="11" fill="${hairColor}"/>`;

  const icon = CLASS_ICONS[classKey] ?? (classKey ? '⭐' : '');
  const badge = icon
    ? `<circle cx="100" cy="100" r="16" fill="white" stroke="${rc.border}" stroke-width="2" opacity="0.95"/>
       <text x="100" y="101" font-size="17" text-anchor="middle" dominant-baseline="middle">${icon}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs><clipPath id="circle-clip"><circle cx="64" cy="64" r="63"/></clipPath></defs>
  <circle cx="64" cy="64" r="63" fill="${rc.bg}"/>
  <rect x="50" y="90" width="28" height="20" rx="6" fill="${rc.skin}" clip-path="url(#circle-clip)"/>
  <rect x="24" y="106" width="80" height="30" rx="10" fill="${rc.border}" opacity="0.7" clip-path="url(#circle-clip)"/>
  ${hair}
  ${earL}
  ${earR}
  <ellipse cx="64" cy="62" rx="27" ry="31" fill="${rc.skin}" stroke="${rc.border}" stroke-width="1.5"/>
  <ellipse cx="54" cy="58" rx="6" ry="7" fill="white"/>
  <ellipse cx="74" cy="58" rx="6" ry="7" fill="white"/>
  <circle cx="55" cy="59" r="4" fill="${rc.border}"/>
  <circle cx="75" cy="59" r="4" fill="${rc.border}"/>
  <circle cx="55.5" cy="59.5" r="2.5" fill="#111"/>
  <circle cx="75.5" cy="59.5" r="2.5" fill="#111"/>
  <circle cx="57" cy="57" r="1.2" fill="white"/>
  <circle cx="77" cy="57" r="1.2" fill="white"/>
  <path d="M61,68 Q64,72 67,68" stroke="${rc.border}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M53,76 Q64,84 75,76" stroke="${rc.border}" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${rc.extra ?? ''}
  <circle cx="64" cy="64" r="63" fill="none" stroke="${rc.border}" stroke-width="3"/>
  ${badge}
</svg>`;
}

export function getAvatarSvgUrl(race: string, playerClass: string, sex: 'M' | 'F' = 'M'): string {
  const svg = buildAvatarSvg(race, playerClass, sex);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
