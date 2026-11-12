import { test } from "node:test";
import assert from "node:assert/strict";
import {
  participantSchema,
  delegationSchema,
  createDelegationSchema,
} from "../../shared/rules.js";
const valid = {
  modality: "AFROPERUANA",
  dance: "Festejo",
  minutes: 7,
  seconds: 0,
  review: "Danza representativa de la cultura afroperuana.",
  representative: "María Pérez",
  dni: "12345678",
  phone: "987654321",
  pairs: Array.from({ length: 10 }, (_, i) => [i * 2 + 1, i * 2 + 2]),
  acceptedBases: true,
};
test("acepta diez parejas y duración mínima afroperuana", () =>
  assert.equal(delegationSchema.safeParse(valid).success, true));

test("modo prueba acepta una pareja y modo normal exige diez", () => {
  const single = { ...valid, pairs: [[1, 2]] };
  assert.equal(createDelegationSchema(true).safeParse(single).success, true);
  assert.equal(createDelegationSchema(false).safeParse(single).success, false);
  assert.equal(
    createDelegationSchema(true).safeParse({ ...single, pairs: [] }).success,
    false,
  );
  assert.equal(
    createDelegationSchema(true).safeParse({ ...single, pairs: [[1, 1]] })
      .success,
    false,
  );
  assert.equal(
    createDelegationSchema(true).safeParse({ ...single, pairs: [[1, 0]] })
      .success,
    false,
  );
});
test("rechaza menos de diez parejas", () =>
  assert.equal(
    delegationSchema.safeParse({ ...valid, pairs: valid.pairs.slice(1) })
      .success,
    false,
  ));
test("rechaza integrante duplicado entre parejas", () =>
  assert.equal(
    delegationSchema.safeParse({
      ...valid,
      pairs: [...valid.pairs.slice(1), [1, 3]],
    }).success,
    false,
  ));
test("verifica límites exactos de duración por modalidad", () => {
  for (const [modality, min, max] of [
    ["AFROPERUANA", 7, 10],
    ["FOLCLORICA", 8, 12],
  ] as const) {
    for (const [minutes, seconds, expected] of [
      [min, 0, true],
      [max, 0, true],
      [max, 1, false],
      [min - 1, 59, false],
    ] as const)
      assert.equal(
        delegationSchema.safeParse({ ...valid, modality, minutes, seconds })
          .success,
        expected,
      );
  }
});
test("rechaza DNI incorrecto y falta de consentimiento", () => {
  const p = {
    firstName: "Ana",
    lastName: "Pérez",
    dni: "12345678",
    dependency: "Rectorado",
    phone: "987654321",
    consent: true,
  };
  assert.equal(participantSchema.safeParse(p).success, true);
  assert.equal(
    participantSchema.safeParse({ ...p, dni: "123" }).success,
    false,
  );
  assert.equal(
    participantSchema.safeParse({ ...p, consent: false }).success,
    false,
  );
});
