const BASE_URL = 'https://image.pollinations.ai/prompt';

export function getAvatarUrl(
  race: string,
  playerClass: string,
  sex: 'M' | 'F' = 'M',
  playerName: string = ''
): string {
  const gender = sex === 'M' ? 'male' : 'female';
  const noClass = !playerClass || playerClass === 'Ninguna' || playerClass === 'None';
  const classStr = noClass ? '' : `, ${playerClass} class`;
  const raceStr = !race || race === 'Humano' || race === 'Human' ? 'human' : race;

  const prompt = [
    `Munchkin card game character portrait`,
    `${raceStr} race${classStr}`,
    gender,
    `John Kovalic cartoon illustration style`,
    `fantasy humor`,
    `colorful`,
    `white background`,
    `cute chibi`,
    `square format`,
    `no text`,
  ].join(', ');

  const seed = hashCode(`${playerName}||${race}||${playerClass}||${sex}`);
  const encoded = encodeURIComponent(prompt);

  return `${BASE_URL}/${encoded}?width=256&height=256&nologo=true&seed=${seed}&model=flux-schnell`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
