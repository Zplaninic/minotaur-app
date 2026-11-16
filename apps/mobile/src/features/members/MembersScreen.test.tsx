import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { MembersScreen } from "./MembersScreen";
import { admin, ana, Providers } from "./testUtils";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

// Answers /me with an admin and every members page with the given result.
const membersAnswer = (result: () => Promise<unknown>) =>
  fetchMock.mockImplementation((path) => (path === "/me" ? Promise.resolve(admin) : result()));

beforeEach(() => {
  fetchMock.mockReset();
  mockPush.mockReset();
});

const renderScreen = () =>
  render(
    <Providers>
      <MembersScreen />
    </Providers>,
  );

describe("MembersScreen", () => {
  it("lists members with their guardians", async () => {
    membersAnswer(async () => ({ items: [ana], page: 1, pageSize: 20, total: 1 }));
    await renderScreen();
    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
    expect(screen.getByText(t("members.guardians", { names: "Iva Horvat" }))).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith("/members?page=1&pageSize=20", expect.anything());
  });

  it("filters to members with unpaid past months", async () => {
    const marko = { ...ana, id: "2", name: "Marko", surname: "Babić", guardians: [] };
    fetchMock.mockImplementation(async (path) => {
      if (path === "/me") {
        return admin;
      }
      const items = path.includes("unpaid=true") ? [ana] : [marko, ana];
      return { items, page: 1, pageSize: 20, total: items.length };
    });
    await renderScreen();
    expect(await screen.findByText("Babić Marko")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("checkbox", { name: t("members.unpaidOnly") }));

    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
    expect(screen.queryByText("Babić Marko")).not.toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith("/members?page=1&pageSize=20&unpaid=true", expect.anything());
  });

  it("says when nobody has an unpaid past month", async () => {
    fetchMock.mockImplementation(async (path) =>
      path === "/me" ? admin : { items: path.includes("unpaid=true") ? [] : [ana], page: 1, pageSize: 20, total: 0 },
    );
    await renderScreen();
    await fireEvent.press(await screen.findByRole("checkbox", { name: t("members.unpaidOnly") }));
    expect(await screen.findByText(t("members.unpaidEmpty"))).toBeOnTheScreen();
  });

  it("labels trainers", async () => {
    membersAnswer(async () => ({ items: [ana, { ...ana, id: "2", name: "Marko", role: "trainer" }], page: 1, pageSize: 20, total: 2 }));
    await renderScreen();
    expect(await screen.findByText("Horvat Marko")).toBeOnTheScreen();
    expect(screen.getAllByText(t("members.trainerLabel"))).toHaveLength(1);
  });

  it("shows the empty state when there are no members", async () => {
    membersAnswer(async () => ({ items: [], page: 1, pageSize: 20, total: 0 }));
    await renderScreen();
    expect(await screen.findByText(t("members.empty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    let online = false;
    membersAnswer(async () => {
      if (!online) {
        throw new ApiError("NETWORK_ERROR");
      }
      return { items: [ana], page: 1, pageSize: 20, total: 1 };
    });
    await renderScreen();
    expect(await screen.findByText(t("members.offlineTitle"))).toBeOnTheScreen();

    online = true;
    await fireEvent.press(screen.getByRole("button", { name: t("common.retry") }));
    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
  });

  it("opens a member's edit screen on tap", async () => {
    membersAnswer(async () => ({ items: [ana], page: 1, pageSize: 20, total: 1 }));
    await renderScreen();
    await fireEvent.press(await screen.findByText("Horvat Ana"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/members/[id]/edit", params: { id: "1" } });
  });

  it("opens the add-member screen", async () => {
    membersAnswer(async () => ({ items: [], page: 1, pageSize: 20, total: 0 }));
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("members.add") }));
    expect(mockPush).toHaveBeenCalledWith("/members/new");
  });
});
