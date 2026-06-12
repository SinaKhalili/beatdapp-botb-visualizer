// The Worker serves two sizes of every archived photo from R2:
//   /photos/<id>.webp         — full size (1280px), for the lightbox/download
//   /photos/thumbs/<id>.webp  — 512px, for planet textures + gallery thumbs
//
// 126 full-size textures decode to ~1GB of GPU memory, which crashes iOS
// Safari; the 512px thumbs keep the whole galaxy under ~200MB.
export function thumbUrl(imageUrl: string): string {
  return imageUrl.replace(/\/photos\/(?!thumbs\/)/, '/photos/thumbs/')
}
