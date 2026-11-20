import type { ImportMembersBody } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { ImportMembers } from "./ImportMembers";

vi.mock("../../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const csv = [
  "Name\tSurname\tBirthday\tGuardian\tGuardian email\tName Guardian\tSupscription",
  "Lovro\tGolub\t2.4.2016.\t\tiva@example.com\tIva Golub\tKids 2x",
  "Ana\tHorvat\t12.3.1990.\t\t\t\t",
].join("\n");

const imports: ImportMembersBody[] = [];

beforeEach(() => {
  imports.length = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/orgs") {
      return { items: [{ id: "1", name: "SPK Minotaur" }] };
    }
    if (path === "/members/import" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as ImportMembersBody;
      imports.push(body);
      return {
        imported: !body.dryRun,
        rows: [
          { status: "create", problems: [] },
          { status: "duplicate", problems: [] },
        ],
      };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderImport = (onClose = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ImportMembers onClose={onClose} />
    </QueryClientProvider>,
  );

const chooseFile = async (text: string) => {
  const input = await screen.findByLabelText(t("membersImport.file"));
  fireEvent.change(input, { target: { files: [new File([text], "members.csv", { type: "text/csv" })] } });
};

describe("ImportMembers", () => {
  it("checks the file, shows the preview and imports the new members", async () => {
    renderImport();
    await chooseFile(csv);

    expect(await screen.findByText(t("membersImport.summary.create", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t("membersImport.status.duplicate"))).toBeInTheDocument();
    expect(imports).toEqual([
      {
        orgId: "1",
        dryRun: true,
        rows: [
          {
            name: "Lovro",
            surname: "Golub",
            birthday: "2016-04-02",
            guardianName: "Iva Golub",
            guardianEmail: "iva@example.com",
            subscription: "Kids 2x",
          },
          { name: "Ana", surname: "Horvat", birthday: "1990-03-12" },
        ],
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: t("membersImport.confirm", { count: 1 }) }));
    expect(await screen.findByText(t("membersImport.done", { count: 1 }))).toBeInTheDocument();
    expect(imports.at(-1)?.dryRun).toBe(false);
  });

  it("shows field errors and does not allow an import while a row is invalid", async () => {
    renderImport();
    await chooseFile(`${csv}\nMia\tGolub\t31.2.2016\t\t\t\t`);

    expect(await screen.findByText(t("membersImport.fieldError.birthday"))).toBeInTheDocument();
    expect(screen.getByText(t("membersImport.fixErrors"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("membersImport.confirm", { count: 1 }) })).toBeDisabled();
    await waitFor(() => expect(imports.every((body) => body.dryRun)).toBe(true));
  });

  it("reports missing columns", async () => {
    renderImport();
    await chooseFile("Name;Birthday\nAna;1.1.2000");
    expect(
      await screen.findByText(t("membersImport.fileError.missingColumns", { columns: t("membersImport.column.surname") })),
    ).toBeInTheDocument();
  });
});
