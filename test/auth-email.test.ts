import assert from "node:assert/strict";
import { test } from "node:test";
import { createEmailVerification, isVerificationValid, normalizeEmail } from "../lib/auth/email.ts";
test("email onboarding normalizes the account identity",()=>{assert.equal(normalizeEmail(" User@Example.COM "),"user@example.com")});
test("email verification accepts issued token only before expiry",()=>{const issued=createEmailVerification("user@example.com",1000);assert.equal(isVerificationValid(issued.record,issued.token,1001),true);assert.equal(isVerificationValid(issued.record,"wrong",1001),false);assert.equal(isVerificationValid(issued.record,issued.token,issued.record.expiresAt),false)});