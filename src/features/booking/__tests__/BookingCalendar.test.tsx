import { fireEvent, render, screen } from "@testing-library/react-native";
import { MonthCalendar, TimePanel } from "../BookingCalendar";

jest.mock("lucide-react-native", () => ({ ChevronLeft: () => null, ChevronRight: () => null }));

// 7:00, 7:15 (llena) y 13:00 en Managua (UTC-6).
const slots = [
  { slot_start: "2026-09-25T13:00:00.000Z", slot_end: "2026-09-25T13:30:00.000Z", free_bays: 2 },
  { slot_start: "2026-09-25T13:15:00.000Z", slot_end: "2026-09-25T13:45:00.000Z", free_bays: 0 },
  { slot_start: "2026-09-25T19:00:00.000Z", slot_end: "2026-09-25T19:30:00.000Z", free_bays: 1 },
];

describe("calendario de reservas (pantalla)", () => {
  it("separa mañana y tarde, muestra cupos y bloquea las horas reservadas", async () => {
    const onChange = jest.fn();
    await render(<TimePanel slots={slots} value={null} onChange={onChange} locale="es" title="viernes 25" />);
    expect(screen.getByText("2 de 3 horarios disponibles")).toBeTruthy();
    expect(screen.getByText("Mañana")).toBeTruthy();
    expect(screen.getByText("Tarde")).toBeTruthy();

    const booked = screen.getByTestId("book-slot-2026-09-25T13:15:00.000Z");
    expect(booked).toBeDisabled();
    await fireEvent.press(booked);
    expect(onChange).not.toHaveBeenCalled();

    expect(screen.getByText("2 cupos")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("book-slot-2026-09-25T19:00:00.000Z"));
    expect(onChange).toHaveBeenCalledWith("2026-09-25T19:00:00.000Z");
  });

  it("colorea los días por disponibilidad y no deja elegir los llenos ni los pasados", async () => {
    const onChange = jest.fn();
    await render(
      <MonthCalendar
        today="2026-09-24"
        horizonDays={14}
        value="2026-09-24"
        onChange={onChange}
        locale="es"
        availability={[
          { day: "2026-09-24", total: 40, free: 28 },
          { day: "2026-09-25", total: 40, free: 0 },
          { day: "2026-09-26", total: 40, free: 4 },
        ]}
      />,
    );
    expect(screen.getByTestId("book-day-2026-09-23")).toBeDisabled();
    expect(screen.getByTestId("book-day-2026-09-25")).toBeDisabled();
    expect(screen.getAllByText("Lleno")).toHaveLength(2); // el día lleno y la leyenda
    expect(screen.getByTestId("book-day-2026-09-24").props.accessibilityLabel).toContain("28 libres");
    expect(screen.getByTestId("book-day-2026-09-26").props.accessibilityLabel).toContain("4 libres");
    await fireEvent.press(screen.getByTestId("book-day-2026-09-26"));
    expect(onChange).toHaveBeenCalledWith("2026-09-26");
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
  });
});
