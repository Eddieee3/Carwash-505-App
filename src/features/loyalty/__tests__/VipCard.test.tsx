import { render, screen } from "@testing-library/react-native";
import type { VipCardState } from "@/shared/database";
import { useVipCard, useWalletPassStatus, useWalletToken } from "../api";
import { VipCard, VipCardView } from "../VipCard";

jest.mock("lucide-react-native", () => ({ Check: () => null, Crown: () => null, Gift: () => null, Maximize2: () => null, X: () => null }));
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
  paid_required: 9,
  remaining_paid: 6,
  next_is_free: false,
  free_wash_reserved: false,
  free_washes_earned: 0,
  total_stamps: 3,
};

describe("tarjeta VIP (inicio)", () => {
  it("muestra las casillas marcadas y cuántos lavados pagados faltan para el gratis (regla 9 + 1)", async () => {
    await render(<VipCardView card={base} />);
    expect(screen.getByText("3 de 9 lavados pagados")).toBeTruthy();
    expect(screen.getByText("Te faltan 6 lavados pagados para el gratis.")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 3, marcada")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 4")).toBeTruthy();
    expect(screen.getByText("Siguiente")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 10: lavado gratis")).toBeTruthy();
    expect(screen.getByText("Gratis")).toBeTruthy();
  });

  it("con cero lavados ninguna casilla aparece marcada: la primera es la siguiente", async () => {
    await render(<VipCardView card={{ ...base, filled: 0, remaining_paid: 9, total_stamps: 0 }} />);
    expect(screen.getByText("0 de 9 lavados pagados")).toBeTruthy();
    expect(screen.getByText("Te faltan 9 lavados pagados para el gratis.")).toBeTruthy();
    expect(screen.getByLabelText("Casilla 1")).toBeTruthy();
    expect(screen.queryByLabelText("Casilla 1, marcada")).toBeNull();
  });

  it("avisa cuando el próximo lavado es gratis", async () => {
    await render(<VipCardView card={{ ...base, filled: 9, remaining_paid: 0, next_is_free: true, total_stamps: 19, free_washes_earned: 1 }} />);
    expect(screen.getByText("9 de 9 lavados pagados")).toBeTruthy();
    expect(screen.getByText("¡Tu próximo lavado es gratis!")).toBeTruthy();
    expect(screen.getByText(/1 lavado gratis ganado/)).toBeTruthy();
  });

  it("si el gratis ya está apartado en una reserva, lo dice", async () => {
    await render(<VipCardView card={{ ...base, filled: 9, remaining_paid: 0, next_is_free: true, free_wash_reserved: true }} />);
    expect(screen.getByText("Tu lavado gratis ya está apartado en tu próxima reserva.")).toBeTruthy();
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
    expect(screen.getByText("3 de 9 lavados pagados")).toBeTruthy();
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
