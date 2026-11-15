import { Link } from "@tanstack/react-router";
import { t } from "../lib/messages";

export const NotFoundPage = () => (
  <>
    <h1>{t("notFound.title")}</h1>
    <p>
      <Link to="/">{t("notFound.home")}</Link>
    </p>
  </>
);
