import { describe, expect, it } from "vitest";
import { TIP_AMOUNT_LABEL, TIP_PAYEE, TIP_UPI_URL, TIP_VPA } from "./config";

describe("UPI tip rail", () => {
  it("is confirmed and never empty", () => {
    expect(TIP_VPA).toBe("sarveshscientist1590-3@okicici");
    expect(TIP_PAYEE).toBe("SKEW");
    expect(TIP_AMOUNT_LABEL).toBe("₹49");
    expect(TIP_UPI_URL).toBe(
      "upi://pay?pa=sarveshscientist1590-3@okicici&pn=SKEW&am=49&cu=INR",
    );
    expect(TIP_UPI_URL.includes("pn=SKEW")).toBe(true);
    expect(TIP_UPI_URL.includes("am=49")).toBe(true);
  });
});
