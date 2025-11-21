import {
  type Card,
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type RecordLogItem,
} from "ts-fsrs";
import type { CustomCard } from "@/cards/components/cards-list";

// Configure FSRS parameters
const params = generatorParameters({
  enable_fuzz: true,
  // You can customize other parameters here if needed
  // w: [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567],
});

export const fsrsScheduler = fsrs(params);

// Create a new empty card with FSRS scheduling
export function createNewCard(): Card {
  return createEmptyCard();
}

// Get the next review for a card based on rating
export function scheduleCard(
  card: Card,
  rating: number,
  reviewDate = new Date()
) {
  const results = fsrsScheduler.repeat(card, reviewDate);
  return results[rating as keyof typeof results] as RecordLogItem;
}

export function toFSRSCard(cardData: CustomCard): Card {
  return {
    due: cardData.due,
    stability: cardData.stability,
    difficulty: cardData.difficulty,
    elapsed_days: cardData.elapsed_days,
    scheduled_days: cardData.scheduled_days,
    reps: cardData.reps,
    lapses: cardData.lapses,
    state: cardData.state,
    last_review: cardData.last_review,
  } as Card;
}

export function fromFSRSCard(fsrsCard: Card) {
  return {
    due: fsrsCard.due,
    stability: Number.isNaN(fsrsCard.stability) ? 0 : fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    learning_steps: fsrsCard.learning_steps,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    last_review: fsrsCard.last_review ?? new Date(),
  };
}

export function getReviewTimePredictions(card: Card, reviewDate = new Date()) {
  const results = fsrsScheduler.repeat(card, reviewDate);
  return {
    again: results[Rating.Again].card.due,
    hard: results[Rating.Hard].card.due,
    good: results[Rating.Good].card.due,
    easy: results[Rating.Easy].card.due,
  };
}

export function formatReviewTime(
  futureDate: Date,
  currentDate = new Date()
): string {
  const diffMs = futureDate.getTime() - currentDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return "< 1m";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  if (diffMonths < 12) return `${diffMonths}mo`;
  return `${diffYears}y`;
}
