import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = "kalali-prototype-v1";

describe("prototype startup and locale smoke tests", () => {
  let host;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dir = "ltr";
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    window.localStorage.clear();
  });

  test("recovers from malformed saved core records without crashing", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 8,
      lang: "en",
      data: {
        requests: [{ id: 42, title: null }],
        bids: [],
        suppliers: [],
        contracts: [],
        approvalTasks: [],
        notifications: [],
        auditLog: [],
      },
    }));

    act(() => root.render(<App />));

    expect(host.textContent).toContain("Saved prototype data was malformed");
    expect(host.textContent).toContain("Procurement Intelligence Platform");
    expect(host.textContent).toContain("B2B Supply Chain Marketplace · KSA");
    expect(host.querySelector('[data-ltr]')).not.toBeNull();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).schemaVersion).toBe(8);
  });

  test("upgrades valid schema-7 browser data to schema 8", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 7,
      data: {
        requests: [],
        bids: [],
        suppliers: [],
        contracts: [],
        notifications: [],
        auditLog: [],
      },
    }));

    act(() => root.render(<App />));

    expect(host.textContent).toContain("Procurement Intelligence Platform");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).schemaVersion).toBe(8);
  });

  test("switches the auth screen to Arabic RTL without reversing English brand phrases", () => {
    act(() => root.render(<App />));

    const languageButton = Array.from(host.querySelectorAll("button"))
      .find(button => button.textContent.trim() === "AR");
    expect(languageButton).toBeTruthy();

    act(() => languageButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(host.textContent).toContain("اختر دورًا تجريبيًا.");
    expect(host.textContent).toContain("Procurement Intelligence Platform");
    expect(host.textContent).toContain("B2B Supply Chain Marketplace · KSA");
    expect(host.querySelectorAll('[data-ltr]').length).toBeGreaterThanOrEqual(2);
  });
});
