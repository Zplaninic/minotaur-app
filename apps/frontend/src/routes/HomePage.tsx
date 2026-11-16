import { Logo } from "../components/Logo";
import { useMessages } from "../lib/messages";

export const HomePage = () => {
  const { t } = useMessages();
  return (
    <h1>
      <Logo variant="app" alt={t("app.name")} />
    </h1>
  );
};
