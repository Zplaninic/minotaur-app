import type {
  AcceptEnrollmentChildBody,
  CreateEnrollmentRequestBody,
  EnrollmentRequestResponse,
  GroupResponse,
  MeResponse,
} from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { enrollmentEmail } from "../features/enrollments/enrollmentEmail";
import { translate as t, translateIn } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const admin: MeResponse = {
  memberId: "9",
  name: "Zvonimir",
  surname: "Admin",
  email: "admin@example.com",
  role: "admin",
  org: { id: "1", name: "SPK Minotaur" },
};

const kidsGroup: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  ageFrom: 4,
  ageTo: 10,
  maxMembers: 12,
  memberCount: 9,
  createdAt: "2026-11-15T17:00:00.000Z",
  updatedAt: "2026-11-15T17:00:00.000Z",
};

// Fake data only.
const email = `Ime Roditelja:
ivan horvat

Telefon:
091 000 0000

Ime Djeteta:
Jan, Eva

Dob Djeteta:
9, 7,5

Email:
parent@example.com`;

const savedRequest = (body: CreateEnrollmentRequestBody): EnrollmentRequestResponse => ({
  id: "5",
  parentName: body.parentName,
  parentSurname: body.parentSurname ?? null,
  parentPhone: body.parentPhone ?? null,
  parentEmail: body.parentEmail ?? null,
  rawText: body.rawText ?? null,
  createdAt: "2026-11-20T09:00:00.000Z",
  children: body.children.map((child, index) => ({
    id: String(10 + index),
    name: child.name,
    age: child.age,
    status: "pending",
    groupId: "1",
    memberId: null,
  })),
});

let me: MeResponse;
let requests: EnrollmentRequestResponse[];
let rejectedRequests: EnrollmentRequestResponse[];
const reopened: string[] = [];
const created: CreateEnrollmentRequestBody[] = [];
const accepted: { path: string; body: AcceptEnrollmentChildBody }[] = [];

beforeEach(() => {
  me = admin;
  requests = [];
  rejectedRequests = [];
  reopened.length = 0;
  created.length = 0;
  accepted.length = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return me;
    }
    if (path === "/groups") {
      return { items: [kidsGroup] };
    }
    if (path === "/enrollment-requests" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as CreateEnrollmentRequestBody;
      created.push(body);
      const request = savedRequest(body);
      requests = [request];
      return request;
    }
    if (path.startsWith("/enrollment-requests?state=open")) {
      return { items: requests, page: 1, pageSize: 20, total: requests.length, waitingByGroup: { "1": 1 } };
    }
    if (path.startsWith("/enrollment-requests?state=rejected")) {
      return { items: rejectedRequests, page: 1, pageSize: 20, total: rejectedRequests.length, waitingByGroup: {} };
    }
    if (path.endsWith("/reopen") && init?.method === "POST") {
      reopened.push(path);
      rejectedRequests = [];
      return requests[0];
    }
    if (path.endsWith("/accept") && init?.method === "POST") {
      accepted.push({ path, body: JSON.parse(String(init.body)) as AcceptEnrollmentChildBody });
      return requests[0];
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: ["/enrollments"] }))} />
    </QueryClientProvider>,
  );

describe("EnrollmentsPage", () => {
  it("reads a pasted email, saves the request, and accepts a child into the recommended group", async () => {
    renderPage();
    expect(await screen.findByText(t("enrollments.empty.open"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("enrollments.add") }));
    const dialog = screen.getByRole("dialog", { name: t("enrollmentForm.title") });
    fireEvent.change(within(dialog).getByLabelText(t("enrollmentForm.email")), { target: { value: email } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("enrollmentForm.read") }));

    expect(within(dialog).getByText(t("enrollmentForm.readOk"))).toBeInTheDocument();
    expect(within(dialog).getByLabelText(t("enrollmentForm.parentName"))).toHaveValue("Ivan");
    expect(within(dialog).getByLabelText(t("enrollmentForm.childAge", { number: 2 }))).toHaveValue("7.5");

    fireEvent.click(within(dialog).getByRole("button", { name: t("enrollmentForm.submit") }));
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toEqual({
      parentName: "Ivan",
      parentSurname: "Horvat",
      parentPhone: "091 000 0000",
      parentEmail: "parent@example.com",
      rawText: email,
      children: [
        { name: "Jan", age: 9 },
        { name: "Eva", age: 7.5 },
      ],
    });

    const card = await screen.findByRole("article", { name: "Ivan Horvat" });
    expect(within(card).getByLabelText(t("enrollments.group", { name: "Jan" }), { exact: false })).toHaveValue("1");
    // 9 members, 1 waiting, so 2 of 12 places are free.
    expect(
      within(card).getAllByRole("option", {
        name: /Petra Kovač.* · 9\/12 members, 1 waiting, 2 free$/,
      }),
    ).toHaveLength(2);

    fireEvent.click(within(card).getAllByRole("button", { name: t("enrollments.accept") })[0] as HTMLElement);
    const acceptDialog = await screen.findByRole("dialog", { name: t("acceptForm.title", { name: "Jan" }) });
    expect(await within(acceptDialog).findByLabelText(t("acceptForm.surname"))).toHaveValue("Horvat");
    fireEvent.click(within(acceptDialog).getByRole("button", { name: t("acceptForm.submit") }));

    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(accepted[0]).toEqual({
      path: "/enrollment-requests/5/children/10/accept",
      body: { surname: "Horvat", groupId: "1" },
    });
  });

  it("shows field errors instead of saving an incomplete request", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t("enrollments.add") }));
    const dialog = screen.getByRole("dialog", { name: t("enrollmentForm.title") });
    fireEvent.click(within(dialog).getByRole("button", { name: t("enrollmentForm.submit") }));

    expect(within(dialog).getByText(t("enrollmentForm.error.parentName"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("enrollmentForm.error.childName"))).toBeInTheDocument();
    expect(created).toHaveLength(0);
  });

  it("lists rejected children in their own tab and puts one back to waiting", async () => {
    const request = savedRequest({ parentName: "Ivan", children: [{ name: "Jan", age: 9 }] });
    rejectedRequests = [{ ...request, children: request.children.map((child) => ({ ...child, status: "rejected" })) }];
    requests = [request];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: t("enrollments.rejected") }));
    fireEvent.click(await screen.findByRole("button", { name: t("enrollments.reopenLabel", { name: "Jan" }) }));

    await waitFor(() => expect(reopened).toEqual(["/enrollment-requests/5/children/10/reopen"]));
    expect(await screen.findByText(t("enrollments.empty.rejected"))).toBeInTheDocument();
  });

  it("tells a trainer the page is not for them", async () => {
    me = { ...admin, role: "trainer" };
    renderPage();
    expect(await screen.findByText(t("auth.noAccess"))).toBeInTheDocument();
  });
});

describe("enrollmentEmail", () => {
  it("lists each child who was not rejected with their group", () => {
    const request = savedRequest({
      parentName: "Ivan",
      parentEmail: "parent@example.com",
      children: [
        { name: "Jan", age: 9 },
        { name: "Eva", age: 7.5 },
        { name: "Lea", age: 3 },
      ],
    });
    const children = request.children.map((child, index) =>
      index === 1 ? { ...child, status: "rejected" as const } : index === 2 ? { ...child, groupId: null } : child,
    );
    const draft = enrollmentEmail({ ...request, children }, [kidsGroup], "en");

    expect(draft.to).toBe("parent@example.com");
    expect(draft.subject).toBe(translateIn("en")("enrollmentEmail.subject"));
    expect(draft.body).toContain(t("enrollmentEmail.greeting", { name: "Ivan" }));
    expect(draft.body).toContain("- Jan: Monday, Wednesday, 5:00 PM–6:30 PM, trainer Petra Kovač");
    expect(draft.body).toContain(`- ${t("enrollmentEmail.childNoGroup", { name: "Lea" })}`);
    expect(draft.body).not.toContain("Eva");
  });

  it("writes the email in the chosen language, whatever the app is shown in", () => {
    const request = savedRequest({ parentName: "Ivan", children: [{ name: "Jan", age: 9 }] });
    const draft = enrollmentEmail(request, [kidsGroup], "hr");
    expect(draft.subject).toBe(translateIn("hr")("enrollmentEmail.subject"));
    expect(draft.body).toContain("- Jan: Ponedjeljak, Srijeda, 17:00–18:30, trener Petra Kovač");
  });

  it("says there is no place when every child was rejected", () => {
    const request = savedRequest({ parentName: "Ivan", children: [{ name: "Jan", age: 9 }] });
    const children = request.children.map((child) => ({ ...child, status: "rejected" as const }));
    const draft = enrollmentEmail({ ...request, children }, [kidsGroup], "en");

    expect(draft.to).toBe("");
    expect(draft.body).toContain(t("enrollmentEmail.noPlace"));
    expect(draft.body).not.toContain(t("enrollmentEmail.intro"));
  });
});
