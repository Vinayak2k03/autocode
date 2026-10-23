import { describe, expect, it } from "vitest";

import { app } from "@/config/app";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from "@/schemas/project";

describe("createProjectSchema", () => {
  it("accepts a valid project", () => {
    const result = createProjectSchema.parse({
      name: "My project",
      description: "A description",
    });
    expect(result.name).toBe("My project");
  });

  it("trims the name", () => {
    expect(createProjectSchema.parse({ name: "  spaced  " }).name).toBe(
      "spaced",
    );
  });

  it.each(["", "   "])("rejects empty/whitespace name %j", (name) => {
    expect(createProjectSchema.safeParse({ name }).success).toBe(false);
  });

  it("rejects a name over the max length", () => {
    const name = "x".repeat(app.projects.nameMaxLength + 1);
    expect(createProjectSchema.safeParse({ name }).success).toBe(false);
  });

  it("rejects a description over the max length", () => {
    const description = "x".repeat(app.projects.descriptionMaxLength + 1);
    expect(
      createProjectSchema.safeParse({ name: "ok", description }).success,
    ).toBe(false);
  });

  it("normalizes an empty description to undefined", () => {
    const result = createProjectSchema.parse({ name: "ok", description: "  " });
    expect(result.description).toBeUndefined();
  });
});

describe("updateProjectSchema", () => {
  it("allows partial updates", () => {
    expect(updateProjectSchema.parse({}).name).toBeUndefined();
  });
});

describe("projectIdSchema", () => {
  it("accepts a uuid", () => {
    expect(
      projectIdSchema.safeParse("123e4567-e89b-12d3-a456-426614174000")
        .success,
    ).toBe(true);
  });

  it.each(["not-a-uuid", "123", "../../etc"])(
    "rejects %s",
    (value) => {
      expect(projectIdSchema.safeParse(value).success).toBe(false);
    },
  );
});
