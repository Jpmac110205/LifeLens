import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const fixture = "tests/fixtures/research-fixture.png";
const image = (await readFile(fixture)).toString("base64");
const prediction = {
  diagnosis: "benign",
  certainty_percent: 91.23,
  riskLevel: "low",
  gradcam_overlay: `data:image/png;base64,${image}`,
};
async function upload(page: Page) {
  await page.getByLabel("Upload research image").setInputFiles(fixture);
  await expect(
    page.getByAltText("Preview of selected research image"),
  ).toBeVisible();
}
async function analyze(page: Page) {
  await upload(page);
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "benign", exact: true }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "healthy", chat_available: true } }),
  );
  await page.route("**/api/predict", (route) =>
    route.fulfill({ json: prediction }),
  );
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: {
        reply: "Model confidence is not a medical diagnosis.",
        error: null,
      },
    }),
  );
  await page.goto("/");
});

test("initial workspace is accessible, responsive, and gated correctly", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A clearer view.",
  );
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Ask LifeLens" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Server connected" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Responsible AI" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("rejects invalid, oversized, and corrupt uploads with recoverable messages", async ({
  page,
}) => {
  const input = page.getByLabel("Upload research image");
  await input.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("text"),
  });
  await expect(page.getByRole("alert")).toContainText("JPG or PNG");
  await input.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("too large");
  await input.setInputFiles({
    name: "corrupt.png",
    mimeType: "image/png",
    buffer: Buffer.from("corrupt"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await upload(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeEnabled();
});

test("analysis sends the selected model and allows switching image views", async ({
  page,
}) => {
  await page.getByLabel("Analysis model").selectOption("melanoma");
  const request = page.waitForRequest("**/api/predict");
  await analyze(page);
  expect((await request).postData()).toContain("melanoma");
  await expect(page.getByText("91.23", { exact: false })).toBeVisible();
  await expect(page.getByAltText("Grad-CAM model attention map")).toBeVisible();
  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(
    page.getByAltText("Original uploaded image", { exact: true }),
  ).toBeVisible();
  const imageContainment = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLImageElement>(
        ".preview-wrap img, .result-image img",
      ),
    ].every((image) => {
      const frame = image.parentElement!.getBoundingClientRect();
      const bounds = image.getBoundingClientRect();
      return bounds.height <= frame.height && bounds.width <= frame.width;
    }),
  );
  expect(imageContainment).toBe(true);
  await expect(
    page.getByText("research-fixture.png", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Analysis model").selectOption("breast");
  await expect(
    page.getByRole("heading", { name: "benign", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Ask LifeLens" }),
  ).toBeDisabled();
});

test("prediction errors and malformed results cannot mark analysis complete", async ({
  page,
}) => {
  await page.route("**/api/predict", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "The selected model is unavailable." },
    }),
  );
  await upload(page);
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(
    page.getByRole("textbox", { name: "Ask LifeLens" }),
  ).toBeDisabled();
  await page.route("**/api/predict", (route) =>
    route.fulfill({ json: { ...prediction, certainty_percent: 101 } }),
  );
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("invalid analysis");
  await page.route("**/api/predict", (route) =>
    route.fulfill({ json: prediction }),
  );
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "benign", exact: true }),
  ).toBeVisible();
});

test("cancelled prediction cannot overwrite a fresh session", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/predict", async (route) => {
    await gate;
    await route.fulfill({ json: prediction }).catch(() => {});
  });
  await upload(page);
  const sent = page.waitForRequest("**/api/predict");
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await sent;
  await expect(
    page.getByRole("button", { name: "Cancel analysis" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  release();
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "benign", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Ask LifeLens" }),
  ).toBeDisabled();
});

test("chat isolates context, prevents duplicate requests, and retries failures", async ({
  page,
}) => {
  await analyze(page);
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 502,
      json: { detail: "The assistant is temporarily unavailable." },
    }),
  );
  await page.getByRole("button", { name: "Explain my results" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  let payload: {
    message: string;
    history: unknown[];
    analysis: typeof prediction & { cancerType: string };
  } | null = null;
  await page.route("**/api/chat", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: { reply: "Confidence reflects the model output.", error: null },
    });
  });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "Confidence reflects the model output.",
  );
  expect(payload).toMatchObject({
    message: "Explain my results",
    history: [],
    analysis: { cancerType: "breast", certainty_percent: 91.23 },
  });
  await expect(
    page.getByRole("log").getByText("Explain my results", { exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "New analysis", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("log")).not.toContainText(
    "Confidence reflects the model output.",
  );
  await expect(
    page.getByAltText("Preview of selected research image"),
  ).toHaveCount(0);
});

test("report requires consent and downloads a safe, self-contained document", async ({
  page,
}) => {
  await analyze(page);
  await page
    .getByRole("textbox", { name: "Ask LifeLens" })
    .fill('<script>alert("test")</script>');
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText(
    "Model confidence is not a medical diagnosis.",
  );
  await page.getByRole("button", { name: "Download research report" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Download report", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  const download = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const result = await download;
  expect(result.suggestedFilename()).toMatch(/^lifelens-breast-.*\.html$/);
  const html = await readFile((await result.path())!, "utf8");
  expect(html).toContain("91.23%");
  expect(html).toContain("data:image/png;base64,");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("research purposes only");
  await expect(
    page.getByRole("button", { name: "Download report again" }),
  ).toBeVisible();
});

test("a pending chat cannot reappear after reset", async ({ page }) => {
  await analyze(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    await gate;
    await route
      .fulfill({ json: { reply: "Old session reply" } })
      .catch(() => {});
  });
  const sent = page.waitForRequest("**/api/chat");
  await page.getByRole("button", { name: "Explain my results" }).click();
  await sent;
  await expect(
    page.getByRole("button", { name: "Explain my results" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "New analysis", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  release();
  await expect(page.getByRole("log")).not.toContainText("Old session reply");
  await expect(
    page.getByRole("textbox", { name: "Ask LifeLens" }),
  ).toBeDisabled();
});
