import { cache } from "react";
import { getPublicationBySlug } from "./cas-store";

/** Dedupe blob reads when layout + page both need the same publication. */
export const getCachedPublicationBySlug = cache(getPublicationBySlug);
