import { useEffect, useRef } from "react";

import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { endSkateCard, setSkateCardServer, showSkateCard, skateCardSupported } from "@/modules/skate-card";
import { skateCardFromHome } from "@/src/skateCard";

import { useHome } from "./queries";

/**
 * The skate-day lock-screen card (iOS Live Activity).
 *
 * The server starts and updates it over APNs. This hook covers the rest:
 * it hands the native side the API URL + auth token (so it can report the
 * card's push tokens even from a background wake), and — whenever the app
 * is open during the card window — starts the card locally if it isn't up
 * yet and refreshes it from Home data.
 */
export function useSkateCard() {
  const { token } = useAuth();
  const home = useHome();

  useEffect(() => {
    if (skateCardSupported && token) setSkateCardServer(API_BASE, token);
  }, [token]);

  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!skateCardSupported || !token || !home.data) return;
    const card = skateCardFromHome(home.data, Date.now());
    if (card === "none") return;

    const serialized = JSON.stringify(card);
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;

    if ("end" in card) endSkateCard(card.end);
    else showSkateCard(card);
  }, [home.data, token]);
}
