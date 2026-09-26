import { normalizeUsername, staffEmail } from "../staff";

describe("usuario del personal", () => {
  it("se normaliza igual que en el servidor (staff-users) y se convierte en su correo interno", () => {
    expect(normalizeUsername("  José Pérez ")).toBe("jose.perez");
    expect(staffEmail("Maria.Lobby")).toBe("maria.lobby@personal.carwash505.invalid");
  });
});
