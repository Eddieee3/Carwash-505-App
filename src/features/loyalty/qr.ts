/**
 * Contenido del QR de la wallet: `cw505:w:<token>`. El token lo emite la BD (issue_wallet_token), dura 90 s
 * y solo sirve para que el personal identifique al cliente (resolve_wallet_token). No contiene datos personales.
 */
export const WALLET_QR_PREFIX = "cw505:w:";
const TOKEN = /^w[0-9a-f]{32}$/;

export function walletQrPayload(token: string): string {
  return `${WALLET_QR_PREFIX}${token}`;
}

/** Token de un QR escaneado, o null si no es un QR de la wallet de Car Wash 505. */
export function parseWalletQr(data: string): string | null {
  if (!data.startsWith(WALLET_QR_PREFIX)) return null;
  const token = data.slice(WALLET_QR_PREFIX.length).trim();
  return TOKEN.test(token) ? token : null;
}
