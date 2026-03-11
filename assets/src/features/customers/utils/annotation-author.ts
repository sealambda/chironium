export interface AuthorFields {
  authorReference?: string | null;
  authorString?: string | null;
}

export interface AuthorInput {
  authorReference?: string;
  authorString?: string;
}

export function toAuthorInput(author: AuthorFields): AuthorInput {
  if (author.authorReference) {
    return { authorReference: author.authorReference };
  }
  if (author.authorString) {
    return { authorString: author.authorString };
  }
  return {};
}
