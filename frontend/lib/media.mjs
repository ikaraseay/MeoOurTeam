/** Curated video frames. Unknown uploads get a neutral cover until one is chosen. */
const videoPosters = Object.freeze({});

export function videoPoster(file, poster = '') {
  return poster || videoPosters[file] || '/images/video-posters/default.svg';
}
