import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { i18n } from "./lib/i18n";

// jsdom has no modal dialog support; the open attribute is enough for tests.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

afterEach(() => {
  cleanup();
  // Tests run in English; a test that switches language must not leak it.
  localStorage.clear();
  void i18n.changeLanguage("en");
});
