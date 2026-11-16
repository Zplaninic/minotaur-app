import { Link } from "@tanstack/react-router";
import { useMessages } from "../lib/messages";

export const NotFoundPage = () => {
  const { t } = useMessages();
  return (
    <>
      <h1>{t("notFound.title")}</h1>
      <p>
        <Link to="/">{t("notFound.home")}</Link>
      </p>
    </>
  );
};
