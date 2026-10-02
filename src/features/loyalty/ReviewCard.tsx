import { useState } from "react";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, Field, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { getCopy } from "@/i18n";
import { useMyReview, useSubmitReview } from "./api";

const RATINGS = ["1", "2", "3", "4", "5"] as const;

/** Calificación privada de un servicio completado. Sin estrellas públicas (regla de la web). */
export function ReviewCard({ bookingId }: { bookingId: string }) {
  const c = getCopy();
  const review = useMyReview(bookingId, true);
  const submit = useSubmitReview(bookingId);
  const [rating, setRating] = useState<(typeof RATINGS)[number] | null>(null);
  const [comment, setComment] = useState("");

  if (review.isLoading) return null;
  if (review.data) {
    return (
      <Card>
        <Text tone="muted">{c.review.thanks}</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.review.title}
      </Text>
      <Text variant="bodySm" tone="muted">
        {c.review.hint}
      </Text>
      <ChoiceChips label={c.review.title} value={rating} onChange={setRating} options={RATINGS.map((r) => ({ value: r, label: r }))} testIDPrefix="rating" />
      <Field label={c.review.comment} value={comment} onChangeText={setComment} multiline maxLength={1000} />
      <Button
        label={c.review.send}
        disabled={rating === null}
        loading={submit.isPending}
        onPress={() =>
          rating && submit.mutate({ rating: Number(rating), comment: comment.trim() }, { onError: (e) => Alert.alert(bookingErrorMessage(e, c)) })
        }
        testID="review-send"
      />
    </Card>
  );
}
