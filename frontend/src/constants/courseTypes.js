/** Classes CSS thématiques pour les badges de type de cours */
export const courseTypeClass = {
  Cardio:      'badge-course badge-course-cardio',
  HIIT:        'badge-course badge-course-hiit',
  Crossfit:    'badge-course badge-course-crossfit',
  Yoga:        'badge-course badge-course-yoga',
  Pilates:     'badge-course badge-course-pilates',
  Musculation: 'badge-course badge-course-musculation',
  Zumba:       'badge-course badge-course-zumba',
}

export function getCourseTypeClass(type) {
  return courseTypeClass[type] || 'badge-course badge-course-default'
}
