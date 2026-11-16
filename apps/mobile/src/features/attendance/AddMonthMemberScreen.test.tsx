import type { GroupAttendanceResponse, GroupMemberResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { admin, Providers } from "../members/testUtils";
import { AddMonthMemberScreen } from "./AddMonthMemberScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

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

const attendance: GroupAttendanceResponse = {
  sessions: [{ id: "11", date: "2026-11-11" }],
  members: [{ id: "4", name: "Leo", surname: "Perić", attendedSessionIds: [] }],
};

beforeEach(() => {
  mockBack.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return admin;
    }
    if (path === "/groups/1/members") {
      return { items: [groupMember("4", "Leo", "Perić"), groupMember("6", "Mia", "Novak")] };
    }
    if (path === "/groups/1/attendance?month=2026-11") {
      return attendance;
    }
    if (path === "/groups/1/months/2026-11/members/6" && init?.method === "PUT") {
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
    expect(screen.queryByText("Perić Leo")).not.toBeOnTheScreen();

    fireEvent.press(add);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/months/2026-11/members/6",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
