import { emailSchema, normalizeEmail, otpSchema } from "../schemas";

describe("validación del inicio de sesión", () => {
  it("normaliza el correo antes de validarlo", () => {
    expect(normalizeEmail("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(emailSchema.safeParse(normalizeEmail("  Ana@Example.COM ")).success).toBe(true);
  });

  it("rechaza correos inválidos o demasiado largos", () => {
    for (const bad of ["", "ana", "ana@", "@example.com", `${"a".repeat(115)}@x.com`]) {
      expect(emailSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("acepta solo códigos de 6 dígitos (tolera espacios al pegar)", () => {
    expect(otpSchema.parse("123456")).toBe("123456");
    expect(otpSchema.parse("123 456")).toBe("123456");
    for (const bad of ["12345", "1234567", "12a456", ""]) {
      expect(otpSchema.safeParse(bad).success).toBe(false);
    }
  });
});
