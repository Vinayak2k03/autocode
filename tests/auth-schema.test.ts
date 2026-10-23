import { describe, expect, it } from "vitest";

import { app } from "@/config/app";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/schemas/auth";

const valid = { email: "user@example.com", password: "password123" };

describe("signUpSchema", () => {
  it("accepts matching passwords", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: valid.password,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched confirm password", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("rejects a password below the minimum length", () => {
    const short = "x".repeat(app.auth.passwordMinLength - 1);
    expect(
      signUpSchema.safeParse({
        email: valid.email,
        password: short,
        confirmPassword: short,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      signUpSchema.safeParse({
        email: "not-an-email",
        password: valid.password,
        confirmPassword: valid.password,
      }).success,
    ).toBe(false);
  });
});

describe("signInSchema", () => {
  it("requires a password", () => {
    expect(
      signInSchema.safeParse({ email: valid.email, password: "" }).success,
    ).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(
      false,
    );
    expect(forgotPasswordSchema.safeParse({ email: valid.email }).success).toBe(
      true,
    );
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching new passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "newpassword1",
        confirmPassword: "newpassword2",
      }).success,
    ).toBe(false);
  });
});
