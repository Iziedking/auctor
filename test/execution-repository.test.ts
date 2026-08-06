import assert from "node:assert/strict";
import test from "node:test";
import { usdMicrosToDecimal } from "../lib/db/execution-repository.ts";
test("USD micros convert to exact database decimals", () => { assert.equal(usdMicrosToDecimal(0n), "0.000000"); assert.equal(usdMicrosToDecimal(2_000_001n), "2.000001"); assert.equal(usdMicrosToDecimal(123_456_789_012n), "123456.789012"); });
test("negative spend is rejected", () => { assert.throws(() => usdMicrosToDecimal(-1n), /negative/); });
