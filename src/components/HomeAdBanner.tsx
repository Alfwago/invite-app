import { useEffect, useMemo, useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { HomeAdItem } from "@/src/api/types";
import { Tap } from "@/src/components/Tap";
import { useHomeAds } from "@/src/hooks/queries";
import { hiddenUntil, pickAd, storeKey } from "@/src/homeAds";
import { colors, radius } from "@/src/theme";

// "This visit" hides last until the app is closed (owner's per-ad x time).
const sessionHidden = new Set<string>();

/** The ad spot at the top of Home (owner 2026-10-21): one uploaded picture /
 *  GIF ad at random from Admin → Home page ads (Show on App or Both) that
 *  this phone hasn't hidden. Tap opens its link; x hides it for the ad's
 *  hide time. Nothing at all when there's no ad. */
export function HomeAdBanner({ visit = 0 }: { visit?: number }) {
  const ads = useHomeAds();
  const list = ads.data ?? [];
  const [stored, setStored] = useState<Record<string, number> | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [ratio, setRatio] = useState(3); // 720x240 until the image loads

  const keysSig = list.map((a) => a.key).join("|");
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, number> = {};
      for (const ad of list) {
        try {
          const v = await SecureStore.getItemAsync(storeKey(ad.key));
          if (v) out[ad.key] = Number(v) || 0;
        } catch {
          // no secure store: nothing hidden
        }
      }
      if (alive) setStored(out);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSig]);

  // One pick per visit to Home (``visit`` changes on focus / pull), like one
  // ad per website page load — not on every render.
  const ad = useMemo(
    () => (stored ? pickAd(list, stored, sessionHidden, Date.now()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keysSig, stored, visit],
  );

  if (!ad || dismissed === ad.key) return null;

  async function hide(a: HomeAdItem) {
    setDismissed(a.key);
    const until = hiddenUntil(a, Date.now());
    if (until === 0) {
      sessionHidden.add(a.key);
      return;
    }
    // Count it as hidden right away, so the next visit picks another ad.
    setStored((s) => ({ ...(s ?? {}), [a.key]: until }));
    try {
      await SecureStore.setItemAsync(storeKey(a.key), String(until));
    } catch {
      sessionHidden.add(a.key);
    }
  }

  const image = (
    <Image
      source={{ uri: ad.image_url }}
      style={[styles.image, { aspectRatio: ratio }]}
      resizeMode="contain"
      accessibilityLabel={ad.alt_text || ad.name}
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width && height) setRatio(width / height);
      }}
    />
  );

  return (
    <View style={styles.card}>
      {ad.link_url ? (
        <Tap
          onPress={() => Linking.openURL(ad.link_url).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={ad.alt_text || ad.name}
        >
          {image}
        </Tap>
      ) : (
        image
      )}
      <Tap
        onPress={() => hide(ad)}
        style={styles.close}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Hide this ad"
      >
        <Text style={styles.closeText}>×</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: "100%" },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.textMuted, fontSize: 20, lineHeight: 22 },
});
