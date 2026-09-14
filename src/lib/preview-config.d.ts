type Environment = Record<string, string | undefined>;
export function databaseUrl(env?: Environment): string;
export function isDemoPreview(env?: Environment): boolean;
export function isReadOnlyPreview(env?: Environment): boolean;
export function isPreviewWriteBlocked(pathname: string, method: string, env?: Environment): boolean;
