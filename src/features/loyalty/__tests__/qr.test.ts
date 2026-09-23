import { parseWalletQr, walletQrPayload } from "../qr";

const TOKEN = "w0123456789abcdef0123456789abcdef";

describe("QR de la wallet", () => {
  it("ida y vuelta: el personal lee el mismo token que emitió la BD", () => {
    expect(walletQrPayload(TOKEN)).toBe(`cw505:w:${TOKEN}`);
    expect(parseWalletQr(walletQrPayload(TOKEN))).toBe(TOKEN);
  });

  it("ignora QR que no son de la wallet (URLs, otros formatos, tokens mal formados)", () => {
    for (const data of ["https://example.com", TOKEN, "cw505:w:", "cw505:w:w123", "cw505:x:" + TOKEN, `cw505:w:${TOKEN}; drop`]) {
      expect(parseWalletQr(data)).toBeNull();
    }
  });
});
