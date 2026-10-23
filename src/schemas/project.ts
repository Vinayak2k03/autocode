import { z } from "zod";

import { app } from "@/config/app";

const { nameMinLength, nameMaxLength, descriptionMaxLength } = app.projects;

export const projectNameSchema = z
  .string()
  .trim()
  .min(nameMinLength, "Project name is required")
  .max(nameMaxLength, `Name must be at most ${nameMaxLength} characters`);

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(
    descriptionMaxLength,
    `Description must be at most ${descriptionMaxLength} characters`,
  )
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
});

export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  description: projectDescriptionSchema,
});

export const projectIdSchema = z.uuid("Invalid project id");

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
