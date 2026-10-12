/** Fixed at the renderer entry. Navigation and viewport never change authority. */
export const VISUAL_PREVIEW =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("sample") === "1";
