import assert from "node:assert/strict";

import {
  calculateRatedSpecialties,
  defaultPriorityOrder,
  normalizeDisabledCriteria,
  normalizePriorityOrder,
  weightsFromPriorityOrder,
} from "../src/lib/university-calculator.ts";

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function specialty(overrides = {}) {
  return {
    id: 1,
    universityId: 1,
    name: "Software Engineering",
    direction: "09.03.04",
    admissionBasis: "both",
    tuitionCost: 200000,
    budgetSeats: 20,
    budgetPassingScore: 250,
    budgetAverageScore: 270,
    budgetMaxScore: 300,
    paidSeats: 30,
    paidPassingScore: 180,
    paidAverageScore: 200,
    paidMaxScore: 230,
    ...overrides,
  };
}

function university(overrides = {}) {
  const id = overrides.id ?? 1;
  return {
    id,
    name: `University ${id}`,
    city: "Moscow",
    hasMilitaryDepartment: false,
    hasDormitory: false,
    commuteMinutes: 40,
    createdAt: "2026-01-01T00:00:00.000Z",
    specialties: [specialty({ id: id * 10, universityId: id, ...(overrides.specialty ?? {}) })],
    ...overrides,
  };
}

run("normalizes priority order and appends missing criteria", () => {
  const normalized = normalizePriorityOrder(["tuition", "commute", "tuition", "unknown"]);

  assert.equal(normalized[0], "tuition");
  assert.equal(normalized[1], "commute");
  assert.deepEqual(new Set(normalized), new Set(defaultPriorityOrder));
});

run("optional disabled criteria receive zero weight", () => {
  const disabled = normalizeDisabledCriteria(["commute", "dormitory", "military"]);
  const weights = weightsFromPriorityOrder(defaultPriorityOrder, disabled);
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  assert.deepEqual(disabled, ["commute", "dormitory"]);
  assert.equal(weights.commute, 0);
  assert.equal(weights.dormitory, 0);
  assert.equal(total, 100);
});

run("lower tuition ranks higher when other paid inputs match", () => {
  const rated = calculateRatedSpecialties(
    [
      university({ id: 1, specialty: { admissionBasis: "paid", tuitionCost: 300000, budgetSeats: 0, budgetPassingScore: 0, budgetAverageScore: 0, budgetMaxScore: 0 } }),
      university({ id: 2, specialty: { admissionBasis: "paid", tuitionCost: 120000, budgetSeats: 0, budgetPassingScore: 0, budgetAverageScore: 0, budgetMaxScore: 0 } }),
    ],
    ["tuition", ...defaultPriorityOrder.filter((key) => key !== "tuition")],
    ["commute", "dormitory"],
  );

  assert.equal(rated[0].university.id, 2);
  assert.ok(rated[0].score > rated[1].score);
});
