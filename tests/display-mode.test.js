import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const utilsSource = fs.readFileSync("frontend/js/pages/display/waiting-display.utils.js", "utf8");
const context = {
  URLSearchParams,
  globalThis: {}
};
context.window = context.globalThis;
vm.createContext(context);
vm.runInContext(utilsSource, context);

const { computeWsReconnectDelay, parseDisplayUiConfig } = context.globalThis.WaitingDisplayUtils;

test("computeWsReconnectDelay applies exponential backoff with cap", () => {
  assert.equal(computeWsReconnectDelay(0), 1500);
  assert.equal(computeWsReconnectDelay(1), 3000);
  assert.equal(computeWsReconnectDelay(2), 6000);
  assert.equal(computeWsReconnectDelay(10), 30000);
});

test("computeWsReconnectDelay sanitizes invalid values", () => {
  assert.equal(computeWsReconnectDelay(-3, -10, 0), 1);
  assert.equal(computeWsReconnectDelay("abc", 1000, 4000), 1000);
});

test("parseDisplayUiConfig merges stored values and URL overrides", () => {
  const config = parseDisplayUiConfig({
    search: "?uiTitle=Hall%20A&uiAccent=%2300aa88&uiVideoOpacity=0.4&uiHideSettings=true",
    storedUi: {
      customTitle: "Old title",
      accentColor: "#ff0000",
      headerBg: "rgba(0,0,0,0.6)",
      logoUrl: "https://example.com/logo.png",
      videoOpacity: 0.9,
      hideSettingsButton: false
    }
  });

  assert.equal(config.customTitle, "Hall A");
  assert.equal(config.accentColor, "#00aa88");
  assert.equal(config.headerBg, "rgba(0,0,0,0.6)");
  assert.equal(config.logoUrl, "https://example.com/logo.png");
  assert.equal(config.videoOpacity, 0.4);
  assert.equal(config.hideSettingsButton, true);
});

test("parseDisplayUiConfig applies defaults and clamps opacity", () => {
  const config = parseDisplayUiConfig({
    search: "?uiVideoOpacity=9&uiHideSettings=0",
    storedUi: null
  });

  assert.equal(config.customTitle, "");
  assert.equal(config.accentColor, "#4f46e5");
  assert.equal(config.headerBg, "rgba(15,23,42,0.55)");
  assert.equal(config.videoOpacity, 1);
  assert.equal(config.hideSettingsButton, false);
});
