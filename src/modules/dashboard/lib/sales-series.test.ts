import { describe, expect, it } from "vitest";
import { buildDailySeries, pctChange, summarizeRange } from "./sales-series";

const now = new Date(2026, 10, 18, 15, 30);
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour);

describe("buildDailySeries", () => {
  it("devuelve un día por posición, el más antiguo primero y hoy al final", () => {
    const series = buildDailySeries([], 3, now);
    expect(series.map((d) => d.date)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(series.every((d) => d.total === 0 && d.orders === 0)).toBe(true);
  });

  it("agrupa por día local y suma importes y pedidos", () => {
    const series = buildDailySeries(
      [
        { createdAt: at(18, 0), total: 10.1 },
        { createdAt: at(18, 23), total: 20.2 },
        { createdAt: at(17), total: 5 },
      ],
      2,
      now
    );
    expect(series).toEqual([
      { date: "2026-11-17", total: 5, orders: 1 },
      { date: "2026-11-18", total: 30.3, orders: 2 },
    ]);
  });

  it("ignora pedidos fuera de la ventana y cruza el cambio de mes", () => {
    const series = buildDailySeries([{ createdAt: new Date(2026, 9, 31, 9), total: 7 }], 19, now);
    expect(series[0]).toEqual({ date: "2026-10-31", total: 7, orders: 1 });
    expect(buildDailySeries([{ createdAt: new Date(2026, 9, 30, 9), total: 7 }], 19, now)[0].total).toBe(0);
  });
});

describe("pctChange", () => {
  it("calcula la variación redondeada", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(100, 100)).toBe(0);
  });

  it("no compara contra un periodo sin ventas", () => {
    expect(pctChange(100, 0)).toBeNull();
  });
});

describe("summarizeRange", () => {
  const series = buildDailySeries(
    [
      { createdAt: at(18), total: 40 },
      { createdAt: at(17), total: 20 },
      { createdAt: at(15), total: 30 },
    ],
    4,
    now
  );

  it("resume el tramo y lo compara con el anterior de igual largo", () => {
    const summary = summarizeRange(series, 2);
    expect(summary.days).toHaveLength(2);
    expect(summary.total).toBe(60);
    expect(summary.orders).toBe(2);
    expect(summary.delta).toBe(100);
  });

  it("deja la variación en null si la serie no trae el periodo anterior completo", () => {
    expect(summarizeRange(series, 3).delta).toBeNull();
  });
});
