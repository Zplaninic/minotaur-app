import type { GroupAttendanceResponse, GroupMemberResponse, MemberResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { admin, ana, Providers } from "../members/testUtils";
import { AddMonthMemberScreen } from "./AddMonthMemberScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

const fetchMock = jest.mocked(api.fetch);

const groupMember = (id: string, name: string, surname: string): GroupMemberResponse => ({
  id,
  name,
  surname,
  birthday: "2019-03-12",
  email: null,
  phone: null,
  guardians: [],
});

const everyoneMember = (id: string, name: string, surname: string, role: MemberResponse["role"]): MemberResponse => ({
  ...ana,
  id,
  name,
  surname,
  role,
  guardians: [],
});

const everyone = [
  everyoneMember("4", "Leo", "Perić", "child"),
  everyoneMember("6", "Mia", "Novak", "child"),
  everyoneMember("7", "Ivo", "Babić", "member"),
  everyoneMember("9", "Petra", "Kovač", "trainer"),
];

const attendance: GroupAttendanceResponse = {
  sessions: [{ id: "11", date: "2026-11-11" }],
  members: [{ id: "4", name: "Leo", surname: "Perić", attendedSessionIds: [], subscription: null, paid: false, comment: null }],
};

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return admin;
    }
    if (path.startsWith("/members?")) {
      return { items: everyone, page: 1, pageSize: 100, total: everyone.length };
    }
    if (path === "/groups/1/members") {
      return { items: [groupMember("4", "Leo", "Perić"), groupMember("6", "Mia", "Novak")] };
    }
    if (path === "/groups/1/attendance?month=2026-11") {
      return attendance;
    }
    if (/^\/groups\/1\/months\/2026-11\/members\/[67]$/.test(path) && init?.method === "PUT") {
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

describe("AddMonthMemberScreen", () => {
  it("lists group members not on the month and adds the tapped one", async () => {
    await render(
      <Providers>
        <AddMonthMemberScreen groupId="1" month="2026-11" />
      </Providers>,
    );
    const add = await screen.findByRole("button", {
      name: t("monthMemberForm.addLabel", { name: "Mia Novak", month: "November 2026" }),
    });
    expect(screen.queryByText("Leo Perić")).not.toBeOnTheScreen();

    await fireEvent.press(add);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/months/2026-11/members/6",
      expect.anything(),
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ joinGroup: false }) }),
    );
  });

  it("adds a member from outside the group to the month and the group", async () => {
    await render(
      <Providers>
        <AddMonthMemberScreen groupId="1" month="2026-11" />
      </Providers>,
    );
    const add = await screen.findByRole("button", {
      name: t("monthMemberForm.addLabel", { name: "Ivo Babić", month: "November 2026" }),
    });
    expect(screen.getByText(t("monthMemberForm.otherMembers"))).toBeOnTheScreen();
    expect(screen.queryByText("Petra Kovač")).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("checkbox", { name: t("monthMemberForm.joinGroup") }));
    expect(screen.getByRole("checkbox", { name: t("monthMemberForm.joinGroup") })).toBeChecked();
    await fireEvent.press(add);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/months/2026-11/members/7",
      expect.anything(),
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ joinGroup: true }) }),
    );
  });

  it("opens the new member form and lists a member just created on top", async () => {
    await render(
      <Providers>
        <AddMonthMemberScreen groupId="1" month="2026-11" newMemberId="7" />
      </Providers>,
    );
    expect(await screen.findByText(t("monthMemberForm.newMemberSection"))).toBeOnTheScreen();
    expect(screen.queryByText(t("monthMemberForm.otherMembers"))).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: t("monthMemberForm.newMember") }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/new-month-member",
      params: { id: "1", month: "2026-11" },
    });
  });
});
