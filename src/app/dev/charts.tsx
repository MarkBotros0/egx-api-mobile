import { Redirect } from "expo-router";

import { ChartGallery } from "@/charts/gallery/ChartGallery";

/** Dev-only chart gallery. A release build has no gallery: it goes home. */
export default function ChartsGalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ChartGallery />;
}
