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
  { id: "pilot-coral", name: "Coral Pilot", url: "https://i.postimg.cc/DzJ1BH5D/614262995c6fc4aa86323c82b276a548.jpg" },
  { id: "pilot-sky", name: "Sky Pilot", url: "https://i.postimg.cc/Y03FvHq0/2bedb425b8fd216c78490f8502ac7f38.jpg" },
  { id: "pilot-violet", name: "Violet Pilot", url: "https://i.postimg.cc/W3sbhJDD/fd30a5b149350d2222e7a920314028db.jpg" },
  { id: "pilot-rose", name: "Rose Pilot", url: "https://i.postimg.cc/yY3B6Tf9/a53e8fbef70751b414ff5104fb7eae2d.jpg" },
  { id: "pilot-lime", name: "Lime Pilot", url: "https://i.postimg.cc/RZ1kqpwH/49b636ae34bb7c56ca41b1637287bf90.jpg" },
  { id: "pilot-ice", name: "Ice Pilot", url: "https://i.postimg.cc/CKm9sZPk/2996bfcfb8dcbb9b35d60c507d939570.jpg" },
  { id: "pilot-sun", name: "Sun Pilot", url: "https://i.postimg.cc/85Y3x2g9/2ac53d3c8ad60454cb6e011e58fb9f71.jpg" },
  { id: "pilot-orbit", name: "Orbit Pilot", url: "https://i.postimg.cc/Rq5YZwhz/b6e0ae56450627de8bcdfc1290e20a10.jpg" },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function getAvatar(id: string | undefined | null) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}
