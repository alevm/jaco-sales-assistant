import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("notifyFeedbackTelegram", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.JACO_OWNER_CHAT_ID = "12345";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("does NOT call Telegram for nice-to-have priority", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await notifyFeedbackTelegram({
      title: "minor",
      description: "",
      priority: "nice-to-have",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Telegram with expected payload for urgent priority", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await notifyFeedbackTelegram({
      title: "Broken",
      description: "app crashes on upload",
      priority: "urgent",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(init?.method).toBe("POST");
    const body = JSON.parse((init!.body as string) ?? "{}");
    expect(body.chat_id).toBe("12345");
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("urgent");
    expect(body.text).toContain("Broken");
    expect(body.text).toContain("app crashes on upload");
  });

  it("calls Telegram for important priority", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await notifyFeedbackTelegram({
      title: "Bug",
      description: "minor issue",
      priority: "important",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1]!.body as string) ?? "{}"
    );
    expect(body.text).toContain("important");
  });

  it("skips silently when TELEGRAM_BOT_TOKEN is unset", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await expect(
      notifyFeedbackTelegram({
        title: "t",
        description: "d",
        priority: "urgent",
      })
    ).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("skips silently when JACO_OWNER_CHAT_ID is unset", async () => {
    delete process.env.JACO_OWNER_CHAT_ID;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await notifyFeedbackTelegram({
      title: "t",
      description: "d",
      priority: "important",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("truncates description to 500 chars", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await notifyFeedbackTelegram({
      title: "t",
      description: "x".repeat(1000),
      priority: "urgent",
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1]!.body as string) ?? "{}"
    );
    const xCount = (body.text.match(/x/g) ?? []).length;
    expect(xCount).toBe(500);
  });

  it("swallows fetch errors (does not throw)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { notifyFeedbackTelegram } = await import("@/lib/notify-telegram");
    await expect(
      notifyFeedbackTelegram({
        title: "t",
        description: "d",
        priority: "urgent",
      })
    ).resolves.toBeUndefined();
  });
});
