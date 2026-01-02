import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { type Extension } from "@codemirror/state";
import type { Node } from "@/db/schema/graph";

interface WikiLinkAutocompleteOptions {
  getNotes: () => Node[];
  onCreateNote?: (title: string) => Promise<Node | null>;
}

function getWikiLinkContext(context: CompletionContext): { from: number; query: string } | null {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  const openBracketIndex = textBefore.lastIndexOf("[[");
  if (openBracketIndex === -1) {
    return null;
  }

  const afterOpen = textBefore.slice(openBracketIndex + 2);
  if (afterOpen.includes("]]")) {
    return null;
  }

  return {
    from: line.from + openBracketIndex + 2,
    query: afterOpen,
  };
}

function createWikiLinkCompletionSource(options: WikiLinkAutocompleteOptions) {
  return (context: CompletionContext): CompletionResult | null => {
    const wikiContext = getWikiLinkContext(context);
    if (!wikiContext) {
      return null;
    }

    const { from, query } = wikiContext;
    const queryLower = query.toLowerCase();
    const notes = options.getNotes();

    const matchingNotes = notes
      .filter((node) => node.type === "note" && node.title.toLowerCase().includes(queryLower))
      .slice(0, 10);

    const completions: Completion[] = matchingNotes.map((note) => ({
      label: note.title,
      apply: `${note.title}]]`,
      type: "text",
      boost: note.title.toLowerCase().startsWith(queryLower) ? 1 : 0,
    }));

    if (
      query.trim().length > 0 &&
      !matchingNotes.some((n) => n.title.toLowerCase() === queryLower)
    ) {
      completions.push({
        label: `Create "${query.trim()}"`,
        apply: async (view, _completion, from, to) => {
          if (!options.onCreateNote) {
            view.dispatch({
              changes: { from, to, insert: `${query.trim()}]]` },
            });
            return;
          }

          const newNote = await options.onCreateNote(query.trim());
          if (newNote) {
            view.dispatch({
              changes: { from, to, insert: `${newNote.title}]]` },
            });
          }
        },
        type: "text",
        boost: -1,
      });
    }

    return {
      from,
      options: completions,
      filter: false,
    };
  };
}

export function wikiLinkAutocomplete(options: WikiLinkAutocompleteOptions): Extension {
  return autocompletion({
    override: [createWikiLinkCompletionSource(options)],
    defaultKeymap: true,
    closeOnBlur: true,
  });
}
