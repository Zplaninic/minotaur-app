import { parseEnrollmentEmail, type ParseProblem } from "@repo/enrollment";
import { ageToInput, type EnrollmentRequestDraft } from "@repo/shared/client";

// The pasted email read into the form. Fields the parser could not find stay
// blank for the admin to fill in. Child keys come from nextKey so React can
// tell the rows apart.
export const enrollmentDraftFromEmail = (
  text: string,
  nextKey: () => string,
): { draft: EnrollmentRequestDraft; problems: ParseProblem[] } => {
  const { enrollment, problems } = parseEnrollmentEmail(text);
  const children = enrollment.children.length > 0 ? enrollment.children : [{ name: "", age: null }];
  return {
    draft: {
      parentName: enrollment.parent.name,
      parentSurname: enrollment.parent.surname ?? "",
      parentPhone: enrollment.parent.phone ?? "",
      parentEmail: enrollment.parent.email ?? "",
      rawText: text,
      children: children.map((child) => ({ key: nextKey(), name: child.name, age: ageToInput(child.age) })),
    },
    problems,
  };
};
