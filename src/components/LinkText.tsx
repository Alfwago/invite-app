import { Fragment, type ReactNode } from "react";
import { Linking, Text, type StyleProp, type TextStyle } from "react-native";

import { colors } from "@/src/theme";

// Bare URLs only. Trailing sentence punctuation is trimmed off the match so
// "see https://x.com." doesn't linkify the dot.
const URL_RE = /https?:\/\/[^\s]+/gi;
const TRAILING = /[.,;:!?)\]}'"]+$/;

function openUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  Linking.openURL(url).catch(() => {});
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Renders text with bare http(s) URLs as tappable links and @-mentions
 *  highlighted. `mentions` is the list of full names recorded on the message. */
export function LinkText({
  children,
  style,
  linkStyle,
  mentions,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  mentions?: string[];
}) {
  const text = children ?? "";
  const mentionRe =
    mentions && mentions.length
      ? new RegExp(
          `@(?:${[...mentions]
            .sort((a, b) => b.length - a.length)
            .map(escapeRe)
            .join("|")})\\b`,
          "g",
        )
      : null;

  function renderPlain(chunk: string, keyBase: string): ReactNode[] {
    if (!mentionRe) return [chunk];
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    mentionRe.lastIndex = 0;
    while ((m = mentionRe.exec(chunk)) !== null) {
      if (m.index > last) out.push(chunk.slice(last, m.index));
      out.push(
        <Text key={`${keyBase}m${m.index}`} style={{ fontWeight: "700" }}>
          {m[0]}
        </Text>,
      );
      last = m.index + m[0].length;
    }
    if (last < chunk.length) out.push(chunk.slice(last));
    return out;
  }

  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    const trailing = TRAILING.exec(raw)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (m.index > last)
      parts.push(<Fragment key={`t${last}`}>{renderPlain(text.slice(last, m.index), `p${last}`)}</Fragment>);
    parts.push(
      <Text
        key={`l${m.index}`}
        style={[{ color: colors.gold, textDecorationLine: "underline" }, linkStyle]}
        onPress={() => openUrl(url)}
      >
        {url}
      </Text>,
    );
    if (trailing) parts.push(<Fragment key={`x${m.index}`}>{trailing}</Fragment>);
    last = m.index + raw.length;
  }
  if (last < text.length)
    parts.push(<Fragment key={`t${last}`}>{renderPlain(text.slice(last), `p${last}`)}</Fragment>);

  return <Text style={style}>{parts.length ? parts : text}</Text>;
}
