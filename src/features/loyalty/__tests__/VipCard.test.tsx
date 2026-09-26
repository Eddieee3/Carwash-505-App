import { render, screen } from "@testing-library/react-native";
import type { VipCardState } from "@/shared/database";
import { useVipCard, useWalletPassStatus, useWalletToken } from "../api";
import { VipCard, VipCardView } from "../VipCard";

jest.mock("lucide-react-native", () => ({ Check: () => null, Crown: () => null, Gift: () => null }));
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));
jest.mock("react-native-qrcode-svg", () => () => null);
jest.mock("../api", () => ({
  useVipCard: jest.fn(),
  useWalletPassStatus: jest.fn(),
  useWalletToken: jest.fn(),
  useAddToPhoneWallet: jest.fn(() => ({ mutate: jest.fn(), isPending: false, variables: undefined })),
}));

const base: VipCardState = {
  enabled: true,
  card_slots: 10,
  card_number: 1,
  filled: 3,
  next_is_free: false,
  free_washes_earned: 0,
  total_stamps: 3,
};

describe("tarjeta VIP (inicio)", () => {
  it("muestra las casillas marcadas y cuántos lavados faltan para el gratis", async () => {
    await render(<VipCardView card={base} />);
    expect(screen.getByText("3 de 10 casillas")).toBeTruthy();
    expect(screen.getByText("Te faltan 6 lavados para el gratis.")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 3, marcada")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 4")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 10: lavado gratis")).toBeTruthy();
    expect(screen.getByText("Gratis")).toBeTruthy();
  });

  it("avisa cuando el próximo lavado es gratis", async () => {
    await render(<VipCardView card={{ ...base, filled: 9, next_is_free: true, total_stamps: 19, free_washes_earned: 1 }} />);
    expect(screen.getByText("¡Tu próximo lavado es gratis!")).toBeTruthy();
    expect(screen.getByText(/1 lavado gratis ganado/)).toBeTruthy();
  });
});

describe("Tarjeta VIP en Perfil", () => {
  beforeEach(() => {
    jest.mocked(useVipCard).mockReturnValue({ data: base } as never);
    jest.mocked(useWalletToken).mockReturnValue({ data: { token: "w" + "0".repeat(32), expires_at: "" } } as never);
  });

  it("con Apple Wallet configurado (iPhone) muestra el resumen y el botón para añadirla, sin QR de la app", async () => {
    jest.mocked(useWalletPassStatus).mockReturnValue({ data: { apple: true, google: true }, isLoading: false } as never);
    await render(<VipCard />);
    expect(screen.getByText("3 / 10 lavados completados")).toBeTruthy();
    expect(screen.getByText("Añadir Tarjeta VIP a Apple Wallet")).toBeTruthy();
    expect(screen.queryByText("Añadir Tarjeta VIP a Google Wallet")).toBeNull();
    expect(screen.queryByTestId("vip-app-qr")).toBeNull();
  });

  it("sin credenciales de wallet muestra las casillas y el QR de la app para que el personal pueda escanear", async () => {
    jest.mocked(useWalletPassStatus).mockReturnValue({ data: { apple: false, google: false }, isLoading: false } as never);
    await render(<VipCard />);
    expect(screen.getByTestId("vip-card")).toBeTruthy();
    expect(screen.getByTestId("vip-app-qr")).toBeTruthy();
  });

  it("si el programa VIP está apagado no muestra nada", async () => {
    jest.mocked(useVipCard).mockReturnValue({ data: { ...base, enabled: false } } as never);
    jest.mocked(useWalletPassStatus).mockReturnValue({ data: { apple: true, google: true }, isLoading: false } as never);
    await render(<VipCard />);
    expect(screen.queryByTestId("vip-card")).toBeNull();
    expect(screen.queryByTestId("vip-card-phone")).toBeNull();
  });
});
