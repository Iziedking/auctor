import { createHash, randomBytes, randomUUID } from "node:crypto";
export type EmailVerification = { readonly email: string; readonly tokenHash: string; readonly expiresAt: number };
export function normalizeEmail(email: string): string { const value=email.trim().toLowerCase(); if(!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(value)) throw new Error("A valid email address is required."); return value; }
export function createEmailVerification(email:string,now=Date.now()){const normalized=normalizeEmail(email);const token=randomBytes(32).toString("hex");return {token,record:{email:normalized,tokenHash:hashToken(token),expiresAt:now+900000} as EmailVerification};}
export function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
export function isVerificationValid(record:EmailVerification,token:string,now=Date.now()){return record.expiresAt>now&&hashToken(token)===record.tokenHash;}
export function createSessionToken(){return randomUUID().replaceAll("-","");}