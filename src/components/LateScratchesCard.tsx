import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { EventDetail, LateScratchEntry } from "@/src/api/types";
import { ChirpThread, chirpCardStyles as styles } from "@/src/components/ChirpThread";
import { Card } from "@/src/components/ui";
import { useChirpOptions, useLateScratchTaunts } from "@/src/hooks/queries";
import { LATE_SCRATCHES_TITLE, lateScratchRows, lateScratchStatus } from "@/src/lateScratch";
import { colors } from "@/src/theme";

/** Late drops a director posted for chirping (server 0.36.0 build 97+).
 *  Never shows money. Hidden when there's nothing posted or the server is
 *  older. Sits above the roster, with the Penalty Box. */
export function LateScratchesCard({ event }: { event: EventDetail }) {
  const rows = lateScratchRows(event);
  if (rows.length === 0) return null;

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="alarm-outline" size={18} color={colors.gold} />
        <Text style={styles.heading}>{LATE_SCRATCHES_TITLE}</Text>
      </View>

      {event.my_late_scratch?.on_board ? (
        <View style={styles.mineBanner}>
          <Text style={styles.mineText}>
            You&apos;re on the board for dropping late. Getting back on the roster takes you off it.
          </Text>
        </View>
      ) : null}

      {rows.map((r) => (
        <LateScratchRow key={r.id} eventId={event.id} entry={r} />
      ))}
    </Card>
  );
}

function LateScratchRow({ eventId, entry }: { eventId: number | string; entry: LateScratchEntry }) {
  const { post, remove } = useLateScratchTaunts(eventId);
  const chirps = useChirpOptions();

  return (
    <View style={styles.row}>
      <Text style={styles.name}>
        {entry.is_me ? "You" : entry.name}
        <Text style={styles.sub}>  ·  {lateScratchStatus(entry.status)}</Text>
      </Text>
      {entry.label ? <Text style={styles.reason}>{entry.label}</Text> : null}
      <ChirpThread
        taunts={entry.taunts}
        canTaunt={entry.can_taunt}
        presets={chirps.data?.late_drop_presets ?? chirps.data?.presets}
        busy={post.isPending || remove.isPending}
        onSend={(text, preset, opts) => post.mutate({ entryId: entry.id, text, preset }, opts)}
        onRemove={(id) => remove.mutate(id)}
      />
    </View>
  );
}
