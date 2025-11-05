// src/utils/slugify.js
// Utility to generate URL-friendly slugs

/**
 * Convert a string to a URL-friendly slug
 * @param {String} text - Text to slugify
 * @returns {String} Slugified text
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
};

/**
 * Generate unique slug by appending number if slug exists
 * @param {String} text - Text to slugify
 * @param {Function} checkExists - Async function to check if slug exists
 * @returns {String} Unique slug
 */
export const generateUniqueSlug = async (text, checkExists) => {
  let slug = slugify(text);
  let counter = 1;
  let uniqueSlug = slug;

  while (await checkExists(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};
