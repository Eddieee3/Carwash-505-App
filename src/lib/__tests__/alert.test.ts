import { showAlert } from "../alert";

/** H02/H03 (auditoría): en web, las confirmaciones deben ejecutar la acción elegida. */
describe("diálogos en web", () => {
  const web = (answer: boolean) => ({ alert: jest.fn(), confirm: jest.fn(() => answer) });

  it("confirmar ejecuta la acción; rechazar ejecuta Cancelar", () => {
    const yes = jest.fn();
    const no = jest.fn();
    const buttons = [
      { text: "No", style: "cancel" as const, onPress: no },
      { text: "Sí", style: "destructive" as const, onPress: yes },
    ];
    const accept = web(true);
    showAlert("¿Marcar como no asistió?", "Ana", buttons, accept);
    expect(accept.confirm).toHaveBeenCalledWith("¿Marcar como no asistió?\n\nAna");
    expect(yes).toHaveBeenCalledTimes(1);
    expect(no).not.toHaveBeenCalled();

    showAlert("¿Marcar como no asistió?", undefined, buttons, web(false));
    expect(no).toHaveBeenCalledTimes(1);
    expect(yes).toHaveBeenCalledTimes(1);
  });

  it("un aviso sin botones de acción se muestra con alert", () => {
    const dialogs = web(true);
    showAlert("Sin conexión");
    showAlert("Sin conexión", undefined, undefined, dialogs);
    expect(dialogs.alert).toHaveBeenCalledWith("Sin conexión");
    expect(dialogs.confirm).not.toHaveBeenCalled();
  });
});
