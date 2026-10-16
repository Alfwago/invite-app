import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { EventDetail, PlayerPenaltyEntry } from "@/src/api/types";
import { ChirpThread, chirpCardStyles as styles } from "@/src/components/ChirpThread";
import { Card } from "@/src/components/ui";
import { useChirpOptions, useTaunts } from "@/src/hooks/queries";
import { colors } from "@/src/theme";

function eligibleLabel(iso: string | null): string {
  if (!iso) return "until invites go out";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "in under an hour";
  if (h < 48) return `in ~${h}h`;
  return `in ~${Math.round(h / 24)}d`;
}

/** Player-facing penalty box: who's boxed, when they're free, and chirps.
 *  "It's for fun on purpose." */
export function PenaltyBoxCard({ event }: { event: EventDetail }) {
  const entries = event.penalty_box;
  const mine = event.my_penalty;
  if (entries.length === 0 && !mine?.in_box) return null;

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="snow-outline" size={18} color={colors.blue} />
        <Text style={styles.heading}>Penalty box</Text>
      </View>

      {mine?.in_box ? (
        <View style={styles.mineBanner}>
          <Text style={styles.mineText}>
            You&apos;re in the box for this skate — you can RSVP {eligibleLabel(mine.eligible_at)}.
          </Text>
        </View>
      ) : null}

      {entries.map((e) => (
        <PenaltyRow key={e.id} eventId={event.id} entry={e} />
      ))}
    </Card>
  );
}

function PenaltyRow({ eventId, entry }: { eventId: number | string; entry: PlayerPenaltyEntry }) {
  const { post, remove } = useTaunts(eventId);
  const chirps = useChirpOptions();

  return (
    <View style={styles.row}>
      <Text style={styles.name}>
        {entry.is_me ? "You" : entry.name}
        <Text style={styles.sub}>  ·  free {eligibleLabel(entry.eligible_at)}</Text>
      </Text>
      {entry.reason ? <Text style={styles.reason}>{entry.reason}</Text> : null}
      <ChirpThread
        taunts={entry.taunts}
        canTaunt={entry.can_taunt}
        presets={chirps.data?.presets}
        busy={post.isPending || remove.isPending}
        onSend={(text, preset, opts) => post.mutate({ entryId: entry.id, text, preset }, opts)}
        onRemove={(id) => remove.mutate(id)}
      />
    </View>
  );
}
