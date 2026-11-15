import { Logo } from "../components/Logo";
import { t } from "../lib/messages";

export const HomePage = () => (
  <h1>
    <Logo variant="app" alt={t("app.name")} />
  </h1>
);
