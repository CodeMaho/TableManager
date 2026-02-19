export function getAvatarUrl(race: string, playerClass: string): string {
  const prompt = `munchkin board game character, ${race} ${playerClass}, cartoon fantasy portrait, colorful, simple background`;
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=128&height=128&nologo=true&seed=${hashCode(race + playerClass)}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
