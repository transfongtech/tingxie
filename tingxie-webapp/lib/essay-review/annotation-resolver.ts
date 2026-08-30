export type EssayAnnotationType =
  | "spelling"
  | "grammar"
  | "structure"
  | "vocabulary";

export interface AnnotationContextAnchor {
  /** Text immediately before the annotated text. */
  before?: string;
  /** Text immediately after the annotated text. */
  after?: string;
}

export interface AnnotationToResolve {
  type: EssayAnnotationType;
  original: string;
  correction: string;
  explanation: string;
  startIndex?: number;
  endIndex?: number;
  /**
   * One-based occurrence of `original`. Zero is also accepted as the first
   * occurrence so callers using zero-based indexing fail safely.
   */
  occurrence?: number;
  contextAnchor?: AnnotationContextAnchor;
  /** @deprecated Use `contextAnchor`. */
  context?: AnnotationContextAnchor;
}

export interface ResolvedAnnotation extends AnnotationToResolve {
  startIndex: number;
  endIndex: number;
}

export type UnresolvedAnnotationReason =
  | "empty-original"
  | "not-found"
  | "invalid-occurrence"
  | "context-not-found"
  | "overlap";

export interface UnresolvedAnnotation {
  annotation: AnnotationToResolve;
  reason: UnresolvedAnnotationReason;
}

export interface AnnotationResolution {
  resolved: ResolvedAnnotation[];
  unresolved: UnresolvedAnnotation[];
}

interface Range {
  start: number;
  end: number;
}

function findOccurrences(text: string, original: string): Range[] {
  const occurrences: Range[] = [];
  let fromIndex = 0;

  while (fromIndex <= text.length - original.length) {
    const start = text.indexOf(original, fromIndex);
    if (start === -1) {
      break;
    }

    occurrences.push({ start, end: start + original.length });
    fromIndex = start + 1;
  }

  return occurrences;
}

function matchesContext(
  text: string,
  range: Range,
  context: AnnotationContextAnchor | undefined,
): boolean {
  if (!context) {
    return true;
  }

  const beforeMatches =
    context.before === undefined ||
    text.slice(Math.max(0, range.start - context.before.length), range.start) ===
      context.before;
  const afterMatches =
    context.after === undefined ||
    text.slice(range.end, range.end + context.after.length) === context.after;

  return beforeMatches && afterMatches;
}

function overlaps(left: Range, right: Range): boolean {
  return left.start < right.end && right.start < left.end;
}

function getContext(
  annotation: AnnotationToResolve,
): AnnotationContextAnchor | undefined {
  return annotation.contextAnchor ?? annotation.context;
}

function isSafeSuppliedRange(
  text: string,
  annotation: AnnotationToResolve,
): annotation is AnnotationToResolve & { startIndex: number; endIndex: number } {
  const { startIndex, endIndex, original } = annotation;
  return (
    Number.isInteger(startIndex) &&
    Number.isInteger(endIndex) &&
    startIndex !== undefined &&
    endIndex !== undefined &&
    startIndex >= 0 &&
    endIndex === startIndex + original.length &&
    endIndex <= text.length &&
    text.slice(startIndex, endIndex) === original &&
    matchesContext(text, { start: startIndex, end: endIndex }, getContext(annotation))
  );
}

function occurrenceIndex(occurrence: number | undefined): number | undefined {
  if (occurrence === undefined) {
    return undefined;
  }
  if (!Number.isInteger(occurrence) || occurrence < 0) {
    return -1;
  }
  return occurrence === 0 ? 0 : occurrence - 1;
}

/**
 * Resolves annotation ranges without trusting model-supplied offsets.
 *
 * Annotations are handled in input order. Once a range is claimed, a later
 * annotation selects its next eligible occurrence or is returned unresolved.
 */
export function resolveAnnotations(
  originalText: string,
  annotations: readonly AnnotationToResolve[],
): AnnotationResolution {
  const resolved: ResolvedAnnotation[] = [];
  const unresolved: UnresolvedAnnotation[] = [];
  const occupied: Range[] = [];
  const lastStartByOriginal = new Map<string, number>();

  for (const annotation of annotations) {
    if (annotation.original.length === 0) {
      unresolved.push({ annotation, reason: "empty-original" });
      continue;
    }

    const allOccurrences = findOccurrences(originalText, annotation.original);
    if (allOccurrences.length === 0) {
      unresolved.push({ annotation, reason: "not-found" });
      continue;
    }

    const anchoredOccurrences = allOccurrences.filter((range) =>
      matchesContext(originalText, range, getContext(annotation)),
    );
    if (anchoredOccurrences.length === 0) {
      unresolved.push({ annotation, reason: "context-not-found" });
      continue;
    }

    const requestedOccurrence = occurrenceIndex(annotation.occurrence);
    if (
      requestedOccurrence !== undefined &&
      (requestedOccurrence < 0 || requestedOccurrence >= allOccurrences.length)
    ) {
      unresolved.push({ annotation, reason: "invalid-occurrence" });
      continue;
    }

    let preferredStart = (lastStartByOriginal.get(annotation.original) ?? -1) + 1;
    if (requestedOccurrence !== undefined) {
      const requestedRange = allOccurrences[requestedOccurrence];
      const requestedAnchorIndex = anchoredOccurrences.findIndex(
        (range) => range.start === requestedRange.start,
      );
      if (requestedAnchorIndex === -1) {
        unresolved.push({ annotation, reason: "context-not-found" });
        continue;
      }
      preferredStart = requestedRange.start;
    } else if (isSafeSuppliedRange(originalText, annotation)) {
      preferredStart = annotation.startIndex;
    }

    const candidates = anchoredOccurrences.filter(
      (range) => range.start >= preferredStart,
    );
    const selected = candidates.find(
      (candidate) => !occupied.some((range) => overlaps(candidate, range)),
    );

    if (!selected) {
      unresolved.push({ annotation, reason: "overlap" });
      continue;
    }

    occupied.push(selected);
    lastStartByOriginal.set(annotation.original, selected.start);
    resolved.push({
      ...annotation,
      startIndex: selected.start,
      endIndex: selected.end,
    });
  }

  return { resolved, unresolved };
}
