import type { GroupMemberResponse, GroupResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { admin, Providers } from "../members/testUtils";
import { GroupScreen } from "./GroupScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

const fetchMock = jest.mocked(api.fetch);

afterEach(() => {
  jest.restoreAllMocks();
});

// Presses one of the buttons of the last Alert.alert, by its text.
const pressAlertButton = async (text: string) => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  await act(() => buttons.find((button) => button.text === text)?.onPress?.());
};


const group: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  memberCount: 1,
  createdAt: "2026-11-15T17:00:00.000Z",
  updatedAt: "2026-11-15T17:00:00.000Z",
};

const groupName = /^Petra Kovač - Monday, Wednesday - 5:00\sPM - 6:30\sPM$/;

let me: typeof admin;
let members: GroupMemberResponse[];
let online: boolean;

beforeEach(() => {
  me = admin;
  members = [
    { id: "4", name: "Ana", surname: "Horvat", birthday: "2014-03-12", email: null, phone: null, guardians: [] },
  ];
  online = true;
  mockPush.mockReset();
  mockBack.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return me;
    }
    if (!online) {
      throw new ApiError("NETWORK_ERROR");
    }
    if (path === "/groups/1" && init?.method === "DELETE") {
      return undefined;
    }
    if (path === "/groups/1") {
      return group;
    }
    if (path === "/groups/1/members") {
      return { items: members };
    }
    if (path === "/groups/1/members/4" && init?.method === "DELETE") {
      members = [];
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = (groupId = "1") =>
  render(
    <Providers>
      <GroupScreen groupId={groupId} />
    </Providers>,
  );

describe("GroupScreen", () => {
  it("shows the group and its members", async () => {
    await renderScreen();
    expect(await screen.findByText(groupName)).toBeOnTheScreen();
    expect(screen.getByText("Horvat Ana")).toBeOnTheScreen();
  });

  it("shows the empty state when the group has no members", async () => {
    members = [];
    await renderScreen();
    expect(await screen.findByText(t("groupMembers.empty"))).toBeOnTheScreen();
  });

  it("shows an error for a group that does not exist", async () => {
    await renderScreen("77");
    expect(await screen.findByText("We could not find what you were looking for.")).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    online = false;
    await renderScreen();
    expect(await screen.findByText(t("group.offlineTitle"))).toBeOnTheScreen();

    online = true;
    await fireEvent.press(screen.getByRole("button", { name: t("common.retry") }));
    expect(await screen.findByText(groupName)).toBeOnTheScreen();
  });

  it("removes a member after confirming", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScreen();
    await fireEvent.press(
      await screen.findByRole("button", { name: t("groupMembers.removeLabel", { name: "Ana Horvat" }) }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      t("groupMembers.confirmTitle", { name: "Ana Horvat" }),
      t("groupMembers.confirmText"),
      expect.anything(),
    );
    await pressAlertButton(t("common.remove"));
    expect(await screen.findByText(t("groupMembers.empty"))).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/members/4",
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps the member when the removal is cancelled", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScreen();
    await fireEvent.press(
      await screen.findByRole("button", { name: t("groupMembers.removeLabel", { name: "Ana Horvat" }) }),
    );
    await pressAlertButton(t("common.cancel"));
    expect(screen.getByText("Horvat Ana")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });

  it("opens the add-member screen for an admin", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("groupMembers.add") }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/groups/[id]/add-member", params: { id: "1" } });
  });

  it("shows a trainer the members without the add and remove buttons", async () => {
    me = { ...admin, role: "trainer" };
    await renderScreen();
    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: t("groupMembers.add") })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: t("group.delete") })).not.toBeOnTheScreen();
  });

  it("deletes the group after confirming and goes back", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("group.delete") }));
    expect(Alert.alert).toHaveBeenCalledWith(
      t("group.deleteConfirmTitle"),
      t("group.deleteConfirmText"),
      expect.anything(),
    );
    await pressAlertButton(t("common.delete"));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/groups/1", expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });
});
