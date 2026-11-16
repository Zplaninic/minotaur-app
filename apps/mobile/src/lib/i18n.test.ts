import { pickLanguage } from "./i18n";

describe("pickLanguage", () => {
  it("picks Croatian for a Croatian device", () => {
    expect(pickLanguage(["hr-HR", "en-US"])).toBe("hr");
  });

  it("picks the first supported language in the preference list", () => {
    expect(pickLanguage(["de-DE", "en-GB", "hr"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(pickLanguage(["de-DE"])).toBe("en");
    expect(pickLanguage([])).toBe("en");
  });
});
