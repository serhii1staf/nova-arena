export interface AvatarOption {
  id: string;
  name: string;
  url: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "pilot-blue", name: "Blue Pilot", url: "https://i.postimg.cc/v8j3y7xs/8f5bdfc936bc2ee9f2add77a4ab3a9a0.jpg" },
  { id: "pilot-pink", name: "Pink Pilot", url: "https://i.postimg.cc/HLptzBRt/2a576595fcb4053db44064b76f638081.jpg" },
  { id: "pilot-gold", name: "Gold Pilot", url: "https://i.postimg.cc/nrQKr59M/a2cfa71e0e785a95cb304e08b2a2a7fa.jpg" },
  { id: "pilot-night", name: "Night Pilot", url: "https://i.postimg.cc/GmRN0P6L/0de603302f40283346b3dec5660dfbd5.jpg" },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function getAvatar(id: string | undefined | null) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}
