export type Gender = "male" | "female" | "other";

export interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  gender: Gender;
  country: string;
  flag: string;
  age: number;
  interests: string[];
  online: boolean;
  verified?: boolean;
}

const AVATAR_SEEDS = [
  "luna", "kai", "nova", "rin", "zane", "iris", "milo", "yuki", "ezra", "sage",
  "aria", "leo", "mira", "axel", "juno", "remy", "skye", "theo", "vera", "wren",
  "nico", "asha", "dax", "lila", "ozzy", "rune", "tess", "yara", "zara", "elio",
];

const COUNTRIES: [string, string][] = [
  ["United States", "🇺🇸"], ["United Kingdom", "🇬🇧"], ["Japan", "🇯🇵"],
  ["Germany", "🇩🇪"], ["France", "🇫🇷"], ["Brazil", "🇧🇷"], ["India", "🇮🇳"],
  ["Canada", "🇨🇦"], ["Australia", "🇦🇺"], ["Spain", "🇪🇸"], ["Italy", "🇮🇹"],
  ["South Korea", "🇰🇷"], ["Mexico", "🇲🇽"], ["Netherlands", "🇳🇱"],
  ["Sweden", "🇸🇪"], ["Turkey", "🇹🇷"], ["Argentina", "🇦🇷"], ["Norway", "🇳🇴"],
];

const INTERESTS = [
  "music", "anime", "gaming", "photography", "travel", "coffee", "art", "movies",
  "books", "fitness", "coding", "fashion", "yoga", "crypto", "design", "cooking",
  "skating", "memes", "k-pop", "lofi", "hiking", "poetry", "tattoos", "vinyl",
];

const BIOS = [
  "just here to vibe ✨", "looking for deep convos 🌙", "tell me your story",
  "introvert with wifi", "sunsets > sunrises", "make me laugh",
  "say something interesting", "midnight thinker", "your next favorite person",
  "no small talk pls", "espresso powered ☕", "lover of strange thoughts",
  "send memes not flowers", "philosophy major irl", "dreaming with my eyes open",
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export function generateUsers(count: number, seed = 42): User[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const gender: Gender = pick<Gender>(["male", "female", "female", "male", "other"], r);
    const [country, flag] = pick(COUNTRIES, r);
    const seedName = AVATAR_SEEDS[i % AVATAR_SEEDS.length] + (i > 29 ? i : "");
    const username = seedName + Math.floor(r() * 99);
    const interests = Array.from(
      new Set(Array.from({ length: 3 + Math.floor(r() * 3) }, () => pick(INTERESTS, r)))
    );
    return {
      id: `u_${i}_${seedName}`,
      username,
      avatar: `https://api.dicebear.com/7.x/${gender === "female" ? "lorelei" : gender === "male" ? "avataaars" : "fun-emoji"}/svg?seed=${seedName}&backgroundColor=transparent`,
      bio: pick(BIOS, r),
      gender,
      country,
      flag,
      age: 18 + Math.floor(r() * 17),
      interests,
      online: r() > 0.25,
      verified: r() > 0.85,
    };
  });
}

export const FEED_USERS = generateUsers(60, 7);

export const RECENT_CHATS = generateUsers(8, 99).map((u, i) => ({
  user: u,
  lastMessage: [
    "hey there 👋", "lol that's wild", "so what's your story?",
    "send a song rec", "okay you got me 😂", "good night ✨",
    "are you still up?", "tell me more",
  ][i],
  unread: i < 3 ? Math.floor(Math.random() * 4) + 1 : 0,
  time: ["now", "2m", "12m", "1h", "3h", "yesterday", "2d", "1w"][i],
}));

export const STRANGER_LINES = [
  "hey :) how's your day going?",
  "where are you from?",
  "what made you open this app tonight?",
  "okay random question — coffee or tea?",
  "tell me something that made you smile today",
  "i'm bored, entertain me 😏",
  "what's playing in your headphones rn?",
];
