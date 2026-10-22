import { useEffect, useState } from "react";
import { Image, type ImageProps, type ImageSourcePropType } from "react-native";

import { heroAspect } from "@/src/heroAspect";

/** A brand picture that follows the website (server 0.38.2, owner
 *  2026-10-21: "if nothing loads use the default always"): shows ``url``
 *  when there is one, and the bundled ``fallback`` while it's missing, if
 *  it fails to load, or on an older server.
 *
 *  ``fitWidth`` (the Home hero, owner 2026-10-21): fill the width and take
 *  the height from the picture's own shape, so nothing is cropped off the
 *  sides. Hero uploads come in different shapes (1068x231, 1083x359). */
export function BrandImage({
  url,
  fallback,
  fitWidth,
  style,
  onLoad,
  ...rest
}: Omit<ImageProps, "source"> & {
  url: string | null | undefined;
  fallback: ImageSourcePropType;
  fitWidth?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const fallbackAspect = heroAspect(Image.resolveAssetSource(fallback));
  const [aspect, setAspect] = useState(fallbackAspect);
  useEffect(() => setFailed(false), [url]);
  const source = url && !failed ? { uri: url } : fallback;
  // Ask for the picture's size up front (onLoad's size isn't reliable on
  // every platform), and go back to the default's shape when it's showing.
  const showingUrl = url && !failed ? url : null;
  useEffect(() => {
    if (!fitWidth) return;
    if (!showingUrl) {
      setAspect(fallbackAspect);
      return;
    }
    let live = true;
    Image.getSize(
      showingUrl,
      (width, height) => live && setAspect((cur) => heroAspect({ width, height }, cur)),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [fitWidth, showingUrl, fallbackAspect]);
  return (
    <Image
      {...rest}
      source={source}
      style={fitWidth ? [style, { height: undefined, aspectRatio: aspect }] : style}
      resizeMode={fitWidth ? "contain" : rest.resizeMode}
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  );
}
