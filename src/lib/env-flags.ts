/**
 * Environment feature flags.
 *
 * Single source of truth for env-driven feature toggles.
 * These are read at call time (not module load time) so tests
 * can set process.env before calling the function.
 */

/**
 * Returns true when vision (image) support is disabled.
 *
 * Vision is ENABLED by default. Set ENABLE_VISION to one of
 * 'false', '0', 'no', or 'off' (case-insensitive) to disable.
 */
export function isVisionDisabled(): boolean {
  const v = (process.env['ENABLE_VISION'] ?? 'true').toLowerCase().trim();
  return v === 'false' || v === '0' || v === 'no' || v === 'off';
}
