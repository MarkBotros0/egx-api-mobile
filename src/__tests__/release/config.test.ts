/// <reference types="node" />
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel));
const expo = JSON.parse(read("app.json").toString()).expo;
const eas = JSON.parse(read("eas.json").toString());

function pngSize(rel: string) {
  const b = read(rel);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const BG = "#0a0a0f";
const ID = "com.markbotros.egxanalytics";

describe("app.json", () => {
  it("is called EGX Analytics and is dark", () => {
    expect(expo.name).toBe("EGX Analytics");
    expect(expo.userInterfaceStyle).toBe("dark");
    expect(expo.backgroundColor).toBe(BG);
    expect(expo.orientation).toBe("portrait");
  });

  it("uses the proposed bundle id on both platforms", () => {
    expect(expo.ios.bundleIdentifier).toBe(ID);
    expect(expo.android.package).toBe(ID);
    expect(expo.ios.supportsTablet).toBe(false);
  });

  it("uses a dark adaptive icon with a monochrome layer", () => {
    expect(expo.android.adaptiveIcon.backgroundColor).toBe(BG);
    expect(expo.android.adaptiveIcon.backgroundImage).toBeUndefined();
    expect(existsSync(resolve(root, expo.android.adaptiveIcon.foregroundImage))).toBe(true);
    expect(existsSync(resolve(root, expo.android.adaptiveIcon.monochromeImage))).toBe(true);
  });

  it("configures a dark splash through the expo-splash-screen plugin", () => {
    const entry = (expo.plugins as unknown[]).find(
      (p) => Array.isArray(p) && p[0] === "expo-splash-screen"
    ) as [string, { backgroundColor: string; image: string; imageWidth: number }] | undefined;
    expect(entry).toBeDefined();
    expect(entry![1].backgroundColor).toBe(BG);
    expect(existsSync(resolve(root, entry![1].image))).toBe(true);
  });

  it.each(["assets/icon.png", "assets/android-icon-foreground.png", "assets/android-icon-monochrome.png", "assets/splash-icon.png"])(
    "%s is 1024×1024",
    (rel) => expect(pngSize(rel)).toEqual({ width: 1024, height: 1024 })
  );
});

describe("eas.json", () => {
  const profile = (name: string) => {
    const p = eas.build[name];
    return p.extends ? { ...eas.build[p.extends], ...p, env: { ...eas.build[p.extends].env, ...p.env } } : p;
  };

  it("has development, preview and production profiles", () => {
    for (const name of ["development", "preview", "production"]) expect(eas.build[name]).toBeDefined();
  });

  it("builds an installable internal APK for preview", () => {
    expect(profile("preview").distribution).toBe("internal");
    expect(profile("preview").android.buildType).toBe("apk");
  });

  it("skips the sibling-repo shared check on every cloud build", () => {
    for (const name of ["development", "preview", "production"]) {
      expect(profile(name).env.SKIP_SHARED_CHECK).toBe("1");
    }
  });

  it("selects an EAS environment per profile (where the EXPO_PUBLIC_* values live)", () => {
    expect(profile("development").environment).toBe("development");
    expect(profile("preview").environment).toBe("preview");
    expect(profile("production").environment).toBe("production");
  });

  it("lets EAS own the build number", () => {
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(profile("production").autoIncrement).toBe(true);
  });
});
