import { describe, expect, it } from "vitest";
import {
  createEnrollmentRequestBody,
  enrollmentAge,
  listEnrollmentRequestsQuery,
  MAX_ENROLLMENT_CHILDREN,
} from "./enrollmentRequest.js";

describe("enrollmentAge", () => {
  it.each([0, 4, 4.1, 4.5, 99.9])("accepts %d", (age) => {
    expect(enrollmentAge.safeParse(age).success).toBe(true);
  });

  it.each([-1, 4.55, 100])("rejects %d", (age) => {
    expect(enrollmentAge.safeParse(age).success).toBe(false);
  });
});

describe("createEnrollmentRequestBody", () => {
  const child = { name: "Lea", age: 4 };

  it("needs between one and the most children allowed", () => {
    expect(createEnrollmentRequestBody.safeParse({ parentName: "Ivan", children: [] }).success).toBe(false);
    expect(createEnrollmentRequestBody.safeParse({ parentName: "Ivan", children: [child] }).success).toBe(true);
    expect(
      createEnrollmentRequestBody.safeParse({
        parentName: "Ivan",
        children: Array.from({ length: MAX_ENROLLMENT_CHILDREN + 1 }, () => child),
      }).success,
    ).toBe(false);
  });
});

describe("listEnrollmentRequestsQuery", () => {
  it("defaults to open and accepts the three states", () => {
    expect(listEnrollmentRequestsQuery.parse({}).state).toBe("open");
    for (const state of ["open", "closed", "rejected"]) {
      expect(listEnrollmentRequestsQuery.parse({ state }).state).toBe(state);
    }
    expect(listEnrollmentRequestsQuery.safeParse({ state: "lost" }).success).toBe(false);
  });
});
