import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isMailtrapSandbox } from "./mailtrap";

describe("isMailtrapSandbox", () => {
  beforeEach(() => {
    delete process.env.MAILTRAP_SANDBOX;
  });

  afterEach(() => {
    delete process.env.MAILTRAP_SANDBOX;
  });

  it("is false when unset", () => {
    expect(isMailtrapSandbox()).toBe(false);
  });

  it("is true for common truthy strings", () => {
    process.env.MAILTRAP_SANDBOX = "true";
    expect(isMailtrapSandbox()).toBe(true);
    process.env.MAILTRAP_SANDBOX = "1";
    expect(isMailtrapSandbox()).toBe(true);
    process.env.MAILTRAP_SANDBOX = "yes";
    expect(isMailtrapSandbox()).toBe(true);
  });
});
