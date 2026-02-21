"use client";

import { FeatureForm } from "../FeatureForm";

export default function NewAttributePage() {
  return (
    <FeatureForm
      isNew
      initial={{
        name_uk: "",
        name_ru: "",
        slug: "",
        feature_type: "S",
        is_filter: false,
        filter_position: 0,
        status: "active",
        variants: [],
      }}
    />
  );
}
