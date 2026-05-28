/**
 * Image-bytes port. Implementations fetch the upstream URL with whatever
 * headers (Referer, UA) the source's CDN expects, and return a Web Response
 * whose body can be streamed straight to the browser.
 */
export type ImageFetcher = {
  fetch(input: { url: string; referer?: string }): Promise<Response>;
};
