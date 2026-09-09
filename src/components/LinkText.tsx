import { Fragment, type ReactNode } from "react";
import { Linking, Text, type StyleProp, type TextStyle } from "react-native";

import { colors } from "@/src/theme";

// Bare URLs only. Trailing sentence punctuation is trimmed off the match so
// "see https://x.com." doesn't linkify the dot.
const URL_RE = /https?:\/\/[^\s]+/gi;
const TRAILING = /[.,;:!?)\]}'"]+$/;

function openUrl(url: string) {
  // http(s) only — never hand user text to tel:/sms:/custom schemes.
  if (!/^https?:\/\//i.test(url)) return;
  Linking.openURL(url).catch(() => {});
}

/** Renders text with bare http(s) URLs as tappable links. */
export function LinkText({
  children,
  style,
  linkStyle,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
}) {
  const text = children ?? "";
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    const trailing = TRAILING.exec(raw)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (m.index > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    parts.push(
      <Text key={`l${m.index}`} style={[{ color: colors.gold, textDecorationLine: "underline" }, linkStyle]} onPress={() => openUrl(url)}>
        {url}
      </Text>,
    );
    if (trailing) parts.push(<Fragment key={`p${m.index}`}>{trailing}</Fragment>);
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);

  return <Text style={style}>{parts.length ? parts : text}</Text>;
}
