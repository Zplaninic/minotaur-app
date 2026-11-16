import type { MemberResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { ana, Providers } from "../members/testUtils";
import { AddGroupMemberScreen } from "./AddGroupMemberScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

const fetchMock = jest.mocked(api.fetch);

const marko: MemberResponse = { ...ana, id: "5", name: "Marko", surname: "Novak", role: "member", guardians: [] };
const petra: MemberResponse = { ...ana, id: "2", name: "Petra", surname: "Kovač", role: "trainer", guardians: [] };

let everyone: MemberResponse[];
let online: boolean;

beforeEach(() => {
  everyone = [ana, marko, petra];
  online = true;
  mockBack.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (!online) {
      throw new ApiError("NETWORK_ERROR");
    }
    if (path.startsWith("/members?")) {
      return { items: everyone, page: 1, pageSize: 100, total: everyone.length };
    }
    if (path === "/groups/1/members") {
      return { items: [{ id: ana.id, name: ana.name, surname: ana.surname }] };
    }
    if (path === "/groups/1/members/5" && init?.method === "PUT") {
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = () =>
  render(
    <Providers>
      <AddGroupMemberScreen groupId="1" />
    </Providers>,
  );

const addLabel = (name: string) => t("groupMemberForm.addLabel", { name });

describe("AddGroupMemberScreen", () => {
  it("offers only children and members who are not in the group", async () => {
    await renderScreen();
    expect(await screen.findByRole("button", { name: addLabel("Marko Novak") })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: addLabel("Ana Horvat") })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: addLabel("Petra Kovač") })).not.toBeOnTheScreen();
  });

  it("adds the pressed member and goes back", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: addLabel("Marko Novak") }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/members/5",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("shows the empty state when nobody is left to add", async () => {
    everyone = [ana, petra];
    await renderScreen();
    expect(await screen.findByText(t("groupMemberForm.membersEmpty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    online = false;
    await renderScreen();
    expect(await screen.findByText(t("groupMemberForm.offlineTitle"))).toBeOnTheScreen();

    online = true;
    await fireEvent.press(screen.getByRole("button", { name: t("common.retry") }));
    expect(await screen.findByRole("button", { name: addLabel("Marko Novak") })).toBeOnTheScreen();
  });
});
