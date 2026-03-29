const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

/**
 * Build a Cloudinary URL for a stored image public_id.
 * @param {string} publicId
 * @param {object} [options] - e.g. { width: 800, quality: 'auto', format: 'auto' }
 */
export function cloudinaryUrl(publicId, options = {}) {
    const transforms = Object.entries({ f: 'auto', q: 'auto', ...options })
        .map(([k, v]) => `${k}_${v}`)
        .join(',')

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`
}
