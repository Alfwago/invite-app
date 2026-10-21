import { useEffect, useState } from "react";
import { Image, type ImageProps, type ImageSourcePropType } from "react-native";

/** A brand picture that follows the website (server 0.38.2, owner
 *  2026-10-21: "if nothing loads use the default always"): shows ``url``
 *  when there is one, and the bundled ``fallback`` while it's missing, if
 *  it fails to load, or on an older server. */
export function BrandImage({
  url,
  fallback,
  ...rest
}: Omit<ImageProps, "source"> & { url: string | null | undefined; fallback: ImageSourcePropType }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const source = url && !failed ? { uri: url } : fallback;
  return <Image {...rest} source={source} onError={() => setFailed(true)} />;
}
