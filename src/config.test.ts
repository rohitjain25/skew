import { describe, expect, it } from "vitest";
import * as config from "./config";
import { LIVES, DAILY_ROUNDS, SITE_URL } from "./config";

describe("product", () => {
  it("stays free with no payment rail", () => {
    expect(LIVES).toBe(3);
    expect(DAILY_ROUNDS).toBe(12);
    expect(SITE_URL).toBe("https://temporary-zippy-mistral-mg92d6h.vercel.app");
    expect(config).not.toHaveProperty("TIP_UPI_URL");
    expect(config).not.toHaveProperty("TIP_VPA");
    expect(config).not.toHaveProperty("TIP_PAYEE");
    expect(config).not.toHaveProperty("TIP_AMOUNT_LABEL");
    expect(JSON.stringify(config)).not.toMatch(/upi:|okicici|sarveshscientist|₹49|VPA/i);
  });
});
