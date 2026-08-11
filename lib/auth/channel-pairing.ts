import { createHash, randomInt } from "node:crypto";
export type ChannelProvider="telegram"|"whatsapp";
export function createPairingCode(now=Date.now()){const code=String(randomInt(100000,1000000));return{code,hash:hashPairingCode(code),expiresAt:new Date(now+10*60*1000)}}
export function hashPairingCode(code:string){return createHash("sha256").update(code.trim()).digest("hex")}
export function normalizeExternalIdentity(provider:ChannelProvider,value:string){const identity=value.trim();if(!identity||identity.length>128)throw new Error("Invalid channel identity.");if(provider==="telegram"&&!/^\d+$/.test(identity))throw new Error("Invalid Telegram identity.");if(provider==="whatsapp"&&!/^\+[1-9]\d{7,14}$/.test(identity))throw new Error("Invalid WhatsApp identity.");return identity}