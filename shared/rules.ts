import { z } from "zod";
const name = z
  .string()
  .trim()
  .min(2, "Ingrese al menos 2 caracteres.")
  .max(150);
export const participantSchema = z.object({
  firstName: name,
  lastName: name,
  dni: z.string().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
  dependency: name,
  phone: z
    .string()
    .regex(/^9\d{8}$/, "Ingrese un celular peruano de 9 dígitos."),
  consent: z.literal(true),
});
export const createDelegationSchema = (testMode = false) =>
  z
    .object({
      modality: z.enum(["AFROPERUANA", "FOLCLORICA"]),
      dance: name,
      minutes: z.number().int(),
      seconds: z.number().int().min(0).max(59),
      review: z.string().trim().max(5000),
      representative: name,
      dni: z.string().regex(/^\d{8}$/),
      phone: z.string().regex(/^9\d{8}$/),
      pairs: z
        .array(
          z.tuple([z.number().int().positive(), z.number().int().positive()]),
        )
        .min(
          testMode ? 1 : 10,
          testMode
            ? "Registre al menos una pareja completa."
            : "Se requieren al menos 10 parejas.",
        )
        .max(10000),
      acceptedBases: z.literal(true),
    })
    .superRefine((d, c) => {
      const duration = d.minutes * 60 + d.seconds;
      const [min, max] = d.modality === "AFROPERUANA" ? [420, 600] : [480, 720];
      if (duration < min || duration > max)
        c.addIssue({
          code: "custom",
          message: `La duración debe ser de ${min / 60} a ${max / 60} minutos.`,
          path: ["minutes"],
        });
      const ids = d.pairs.flat();
      if (new Set(ids).size !== ids.length)
        c.addIssue({
          code: "custom",
          message: "Un participante no puede integrar más de una pareja.",
          path: ["pairs"],
        });
    });
export const delegationSchema = createDelegationSchema();
export type ParticipantInput = z.infer<typeof participantSchema>;
export type Participant = ParticipantInput & { id: number; createdAt: string };
export type Delegation = Omit<
  z.infer<typeof delegationSchema>,
  "acceptedBases"
> & { acceptedBases: boolean };
