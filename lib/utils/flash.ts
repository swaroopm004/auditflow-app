/**
 * Card-flash helper — equivalent to HTML's `_s4FlashCard`.
 *
 * Pulses a red glow around a target element (matched by id) twice via the
 * `.card-flash` keyframe defined in `app/globals.css`. Used to draw the eye
 * to the team / card that failed validation when "Continue" is clicked.
 *
 *   const flash = useFlashElement();
 *   ...
 *   flash("s1-team-team1");      // pulse the element with that id
 *
 * The function also smooth-scrolls the element into view so the user sees
 * the animation. Safe to call before paint — re-triggers the animation by
 * removing + re-adding the class with a layout flush in between.
 */
"use client";

import { useCallback } from "react";

export type FlashFn = (elementId: string) => void;

export function useFlashElement(): FlashFn {
  return useCallback((elementId: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(elementId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Restart the keyframe animation: remove the class, force a reflow,
    // re-add the class. The void-offsetWidth trick is the canonical
    // way to interrupt a CSS animation in vanilla DOM.
    el.classList.remove("card-flash");
    void el.offsetWidth;
    el.classList.add("card-flash");
    window.setTimeout(() => el.classList.remove("card-flash"), 3000);
  }, []);
}
