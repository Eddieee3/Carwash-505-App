import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { dark, palette } from "../tokens";

describe("componentes base", () => {
  it("Button expone rol, etiqueta y responde al toque", async () => {
    const onPress = jest.fn();
    await render(<Button label="Enviar código" onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Enviar código" });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("Button en carga queda ocupado y deshabilitado", async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} loading />);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("Field muestra el error y lo anuncia como pista accesible", async () => {
    await render(<Field label="Correo" value="" onChangeText={() => {}} error="Escribe un correo válido." />);
    expect(screen.getByText("Escribe un correo válido.")).toBeTruthy();
    expect(screen.getByLabelText("Correo").props.accessibilityHint).toBe("Escribe un correo válido.");
  });

  it("los tokens mantienen los colores de la web", () => {
    expect(dark.bg).toBe("#05070a");
    expect(palette.brand).toBe("#0b5ea8");
    expect(palette.cyan).toBe("#42c8f5");
  });
});
