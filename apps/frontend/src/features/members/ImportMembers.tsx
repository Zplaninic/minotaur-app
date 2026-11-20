import type { ImportMembersResponse, ImportRowStatus } from "@repo/shared";
import {
  importableMembers,
  readImportFile,
  toErrorCode,
  type ImportFile,
  type ImportLine,
} from "@repo/shared/client";
import { useId, useState, type ChangeEvent } from "react";
import { useImportMembers } from "../../api/members";
import { Button } from "../../components/Button";
import fieldStyles from "../../components/Field.module.css";
import { LoadingState } from "../../components/LoadingState";
import {
  importColumnKey,
  importFieldErrorKey,
  importFileErrorKey,
  importProblemKey,
  importStatusKey,
  useMessages,
} from "../../lib/messages";
import { readTextFile } from "../../lib/readTextFile";
import styles from "./ImportMembers.module.css";

type ImportMembersProps = {
  onClose: () => void;
};

type LineOutcome = { status: ImportRowStatus; messages: string[] };

// Lines with field errors never reach the server; the others line up with the report's rows.
const outcomesOf = (
  lines: readonly ImportLine[],
  report: ImportMembersResponse | undefined,
  t: ReturnType<typeof useMessages>["t"],
): (LineOutcome | undefined)[] => {
  let reportIndex = 0;
  return lines.map((line) => {
    if (line.errors.length > 0) {
      return { status: "invalid", messages: line.errors.map((field) => t(importFieldErrorKey(field))) };
    }
    const row = report?.rows[reportIndex];
    reportIndex += 1;
    return row && { status: row.status, messages: row.problems.map((problem) => t(importProblemKey(problem))) };
  });
};

const countOf = (outcomes: readonly (LineOutcome | undefined)[], status: ImportRowStatus): number =>
  outcomes.filter((outcome) => outcome?.status === status).length;

export const ImportMembers = ({ onClose }: ImportMembersProps) => {
  const { t, errorMessage } = useMessages();
  const preview = useImportMembers();
  const save = useImportMembers();
  const [file, setFile] = useState<ImportFile | undefined>();
  const [unreadable, setUnreadable] = useState(false);
  const fileInputId = useId();

  const check = (checked: ImportFile | undefined) => {
    save.reset();
    const rows = checked?.ok ? importableMembers(checked.lines) : [];
    if (rows.length > 0) {
      preview.mutate({ rows, dryRun: true });
    } else {
      preview.reset();
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    let read: ImportFile | undefined;
    try {
      read = chosen ? readImportFile(await readTextFile(chosen)) : undefined;
      setUnreadable(false);
    } catch {
      setUnreadable(true);
    }
    setFile(read);
    check(read);
  };

  const lines = file?.ok ? file.lines : [];
  const report = save.data ?? preview.data;
  const outcomes = outcomesOf(lines, report, t);
  const created = countOf(outcomes, "create");
  const duplicates = countOf(outcomes, "duplicate");
  const invalid = countOf(outcomes, "invalid");
  const checked = report !== undefined || (lines.length > 0 && invalid === lines.length);
  const imported = save.data?.imported === true;
  const canImport = checked && !preview.isPending && invalid === 0 && created > 0 && !imported;

  const fileError = unreadable
    ? t("membersImport.fileError.unreadable")
    : file && !file.ok
      ? t(importFileErrorKey(file.error), {
          columns: file.missing.map((field) => t(importColumnKey(field))).join(", "),
        })
      : undefined;

  if (imported) {
    return (
      <div className={styles.form}>
        <output>{t("membersImport.done", { count: created })}</output>
        <div className={styles.actions}>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p>{t("membersImport.intro")}</p>

      <div className={fieldStyles.field}>
        <label htmlFor={fileInputId} className={fieldStyles.label}>
          {t("membersImport.file")}
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          className={fieldStyles.control}
          onChange={(event) => void onFileChange(event)}
          aria-invalid={fileError ? true : undefined}
        />
        {fileError ? (
          <p role="alert" className={fieldStyles.error}>
            {fileError}
          </p>
        ) : null}
      </div>

      {preview.isPending ? <LoadingState label={t("membersImport.checking")} /> : null}
      {preview.isError ? (
        <div className={styles.formError}>
          <p role="alert">{errorMessage(toErrorCode(preview.error))}</p>
          <Button variant="secondary" onClick={() => check(file)}>
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {lines.length > 0 && checked && !preview.isPending ? (
        <>
          <ul className={styles.summary} aria-live="polite">
            <li>{t("membersImport.summary.create", { count: created })}</li>
            <li>{t("membersImport.summary.duplicate", { count: duplicates })}</li>
            <li>{t("membersImport.summary.invalid", { count: invalid })}</li>
          </ul>
          {invalid > 0 ? <p className={styles.formError}>{t("membersImport.fixErrors")}</p> : null}
          {invalid === 0 && created === 0 ? <p>{t("membersImport.nothingToImport")}</p> : null}

          <div className={styles.scroll}>
            <table className={styles.table}>
              <caption className={styles.caption}>{t("membersImport.table.caption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("membersImport.table.row")}</th>
                  <th scope="col">{t("membersImport.table.member")}</th>
                  <th scope="col">{t(importColumnKey("birthday"))}</th>
                  <th scope="col">{t("membersImport.table.guardian")}</th>
                  <th scope="col">{t(importColumnKey("subscription"))}</th>
                  <th scope="col">{t("membersImport.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const outcome = outcomes[index];
                  return (
                    <tr key={line.row} className={outcome?.status === "invalid" ? styles.invalid : undefined}>
                      <td className={styles.number}>{line.row}</td>
                      <th scope="row">{[line.cells.name, line.cells.surname].filter(Boolean).join(" ")}</th>
                      <td className={styles.nowrap}>{line.cells.birthday}</td>
                      <td>
                        {line.cells.guardianName}
                        {line.cells.guardianEmail ? <div className={styles.secondary}>{line.cells.guardianEmail}</div> : null}
                      </td>
                      <td>{line.cells.subscription}</td>
                      <td>
                        {outcome ? (
                          <>
                            <span className={styles.status}>{t(importStatusKey(outcome.status))}</span>
                            {outcome.messages.map((message) => (
                              <div key={message} className={styles.secondary}>
                                {message}
                              </div>
                            ))}
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {save.isError ? (
        <p role="alert" className={styles.formError}>
          {errorMessage(toErrorCode(save.error))}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={!canImport}
          pending={save.isPending}
          onClick={() => {
            if (file?.ok) {
              save.mutate({ rows: importableMembers(file.lines), dryRun: false });
            }
          }}
        >
          {save.isPending ? t("membersImport.importing") : t("membersImport.confirm", { count: created })}
        </Button>
      </div>
    </div>
  );
};
