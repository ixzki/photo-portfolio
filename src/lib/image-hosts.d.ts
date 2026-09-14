export function parseImageHosts(value?: string): string[];
export function getUpyunHosts(): string[];
export function isUpyunHostname(hostname: string): boolean;
export function isUnsplashHostname(hostname: string): boolean;
export function upyunTransformsEnabled(): boolean;
export function getImageRemotePatterns(extraHosts?: string): {
  protocol: "https";
  hostname: string;
  port: string;
  pathname: string;
}[];
