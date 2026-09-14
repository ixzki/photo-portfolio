const DEFAULT_UPYUN_HOSTS = ["img.ixzki.com"];
const UNSPLASH_HOSTS = ["images.unsplash.com", "plus.unsplash.com"];

// Accept exact public hostnames only: no schemes, paths, ports or wildcards.
export function parseImageHosts(value = "") {
  return [...new Set(value.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean))].map((host) => {
    if (host.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host)) {
      throw new Error(`Invalid image hostname: ${host}. Use comma-separated exact hostnames without https://, ports, paths or wildcards.`);
    }
    return host;
  });
}

export function getUpyunHosts() {
  // Direct references let Next.js inline these public values into browser bundles.
  return [...new Set([...DEFAULT_UPYUN_HOSTS, ...parseImageHosts(process.env.NEXT_PUBLIC_UPYUN_HOSTS)])];
}

export function isUpyunHostname(hostname) {
  return getUpyunHosts().includes(hostname.toLowerCase());
}

export function isUnsplashHostname(hostname) {
  return UNSPLASH_HOSTS.includes(hostname.toLowerCase());
}

export function upyunTransformsEnabled() {
  return process.env.NEXT_PUBLIC_UPYUN_TRANSFORMS?.trim().toLowerCase() !== "false";
}

/** @returns {{ protocol: "https", hostname: string, port: string, pathname: string }[]} */
export function getImageRemotePatterns(extraHosts = "") {
  return [...new Set([...getUpyunHosts(), ...UNSPLASH_HOSTS, ...parseImageHosts(extraHosts)])].map((hostname) => ({
    protocol: "https",
    hostname,
    port: "",
    pathname: "/**",
  }));
}
