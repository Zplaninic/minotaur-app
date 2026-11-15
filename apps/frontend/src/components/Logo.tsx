import logo from "../assets/minotaur_logo.png";
import clubLogo from "../assets/spk_minotaur_logo.png";
import styles from "./Logo.module.css";

type LogoProps = {
  // "club" adds the "Sportsko penjački klub" tagline.
  variant: "app" | "club";
  alt: string;
  // Header size: a 2:1 box that crops only the file's transparent padding.
  compact?: boolean;
};

// Both files are 1200x1133; the size attributes reserve space before the image loads.
export const Logo = ({ variant, alt, compact = false }: LogoProps) => (
  <img
    src={variant === "club" ? clubLogo : logo}
    alt={alt}
    width={1200}
    height={1133}
    className={compact ? styles.compact : styles.logo}
  />
);
