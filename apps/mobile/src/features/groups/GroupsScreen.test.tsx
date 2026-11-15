import type { GroupResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { admin, Providers } from "../members/testUtils";
import { GroupsScreen } from "./GroupsScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const group: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  createdAt: "2026-11-15T17:00:00.000Z",
  updatedAt: "2026-11-15T17:00:00.000Z",
};

const groupName = /^Petra Kovač - Monday, Wednesday - 5:00\sPM - 6:30\sPM$/;

// Answers /me with the given member and /groups with the given result.
const answer = (me: typeof admin, result: () => Promise<unknown>) =>
  fetchMock.mockImplementation((path) => (path === "/me" ? Promise.resolve(me) : result()));

beforeEach(() => {
  fetchMock.mockReset();
  mockPush.mockReset();
});

const renderScreen = () =>
  render(
    <Providers>
      <GroupsScreen />
    </Providers>,
  );

describe("GroupsScreen", () => {
  it("lists groups named after their trainer, days and time", async () => {
    answer(admin, async () => ({ items: [group] }));
    await renderScreen();
    expect(await screen.findByText(groupName)).toBeOnTheScreen();
  });

  it("shows the empty state when there are no groups", async () => {
    answer(admin, async () => ({ items: [] }));
    await renderScreen();
    expect(await screen.findByText(t("groups.empty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    let online = false;
    answer(admin, async () => {
      if (!online) {
        throw new ApiError("NETWORK_ERROR");
      }
      return { items: [group] };
    });
    await renderScreen();
    expect(await screen.findByText(t("groups.offlineTitle"))).toBeOnTheScreen();

    online = true;
    await fireEvent.press(screen.getByRole("button", { name: t("common.retry") }));
    expect(await screen.findByText(groupName)).toBeOnTheScreen();
  });

  it("opens the add-group screen for an admin", async () => {
    answer(admin, async () => ({ items: [] }));
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("groups.add") }));
    expect(mockPush).toHaveBeenCalledWith("/groups/new");
  });

  it("shows a trainer the list without the add button", async () => {
    answer({ ...admin, role: "trainer" }, async () => ({ items: [group] }));
    await renderScreen();
    expect(await screen.findByText(groupName)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: t("groups.add") })).not.toBeOnTheScreen();
  });
});
