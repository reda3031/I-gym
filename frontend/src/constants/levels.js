/** Classes CSS thématiques pour les badges de niveau */
export const levelBadgeClass = {
  bronze:   'level-badge level-badge-bronze',
  silver:   'level-badge level-badge-silver',
  gold:     'level-badge level-badge-gold',
  platinum: 'level-badge level-badge-platinum',
}

export function getLevelBadgeClass(level) {
  return levelBadgeClass[level] || levelBadgeClass.bronze
}

export const levelTextClass = {
  bronze:   'text-level-bronze',
  silver:   'text-level-silver',
  gold:     'text-level-gold',
  platinum: 'text-level-platinum',
}
