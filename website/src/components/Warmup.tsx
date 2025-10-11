"use client";
import { useEffect } from "react";
import { API_URL } from "@/lib/config";

export default function Warmup() {
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        // GET / como health
        await fetch(`${API_URL}/`, { signal: controller.signal, cache: "no-store" });
      } catch {
      }
    })();
    return () => controller.abort();
  }, []);
  return null;
}
