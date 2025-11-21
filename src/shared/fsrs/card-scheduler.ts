import { Rating } from "ts-fsrs";
import type { CustomCard } from "@/cards/components/cards-list";
import { userDecksCollection } from "@/decks/collection";
import { fsrsScheduler } from "./";

export class CardScheduler {
  private store: Store;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 1000;
  private userId: string;

  constructor(store: Store, userId: string) {
    this.store = store;
    this.userId = userId;
  }

  start() {
    if (this.intervalId) {
      this.stop();
    }
    this.checkAndProcessDecks();
    this.intervalId = setInterval(() => {
      this.checkAndProcessDecks();
    }, this.CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  checkAndProcessDecks() {
    try {
      userDecksCollection.get;
      const decks = this.store.query(userDecksLastReset$(this.userId));
      decks.forEach((deck) => this.processDeckIfResetNeeded(deck as Deck));
    } catch (error) {
      console.error("Error in card scheduler:", error);
    }
  }

  processDeckIfResetNeeded(
    deck: Pick<
      Deck,
      | "id"
      | "lastReset"
      | "resetTime"
      | "newCardsPerDay"
      | "limitNewCardsToDaily"
    >
  ) {
    const now = new Date();
    const lastReset = new Date(deck.lastReset);
    const resetTime = deck.resetTime || { hour: 0, minute: 0 };
    // Create today's reset time
    const todayReset = new Date();
    todayReset.setHours(resetTime.hour, resetTime.minute, 0, 0);
    const shouldReset = now >= todayReset && lastReset < todayReset;
    if (shouldReset) {
      this.moveNewCardsToLearning(deck);
    }
  }

  private moveNewCardsToLearning(
    deck: Pick<Deck, "id" | "newCardsPerDay" | "limitNewCardsToDaily">
  ) {
    try {
      const now = new Date();
      const allCards = this.store.query(cardsByDeck$(deck.id));

      let cardsToMove: number;
      if (deck.limitNewCardsToDaily ?? true) {
        // Count cards currently in learning state (state = 1)
        const learningCards = allCards.filter(
          (card) => card.state === 1 && card.due <= now
        ).length;
        // Only add enough to reach the daily limit
        cardsToMove = Math.max(0, deck.newCardsPerDay - learningCards);
      } else {
        // Always move the full newCardsPerDay amount
        cardsToMove = deck.newCardsPerDay;
      }

      const newCards = allCards
        .filter((card) => card.state === 0)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .map((card) => {
          const results = fsrsScheduler.repeat(card, new Date());
          return {
            ...results[Rating.Good].card,
            due: new Date(),
          };
        })
        .slice(0, cardsToMove) as CustomCard[];

      for (const card of newCards) {
        this.store.commit(
          events.cardReviewed({
            id: card.id,
            due: now,
            stability: card.stability,
            difficulty: card.difficulty,
            learning_steps: card.learning_steps,
            elapsed_days: card.elapsed_days,
            scheduled_days: card.scheduled_days,
            reps: card.reps,
            lapses: card.lapses,
            state: card.state,
            last_review: new Date(),
            updatedAt: new Date(),
          })
        );
      }
      this.store.commit(
        events.deckUpdated({
          id: deck.id,
          lastReset: now,
          updatedAt: now,
        })
      );
    } catch (error) {
      console.error(`Error moving cards for deck ${deck.id}:`, error);
    }
  }
}

// Singleton instance
export let schedulerInstance: CardScheduler | null = null;

export const startCardScheduler = (store: Store, userId: string) => {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
  schedulerInstance = new CardScheduler(store, userId);
  schedulerInstance.start();
  return schedulerInstance;
};

export const stopCardScheduler = () => {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
};
