import { clearSessionToken, getSessionToken, saveSessionToken } from "./sessionToken.web";

describe("sessionToken (web)", () => {
  it("keeps the token in memory until it is cleared", async () => {
    expect(await getSessionToken()).toBeNull();
    await saveSessionToken("abc");
    expect(await getSessionToken()).toBe("abc");
    await clearSessionToken();
    expect(await getSessionToken()).toBeNull();
  });
});
