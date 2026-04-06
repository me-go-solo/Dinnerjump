import { customAlphabet } from 'nanoid'
const generate = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)
export function generateInviteCode(): string { return generate() }
