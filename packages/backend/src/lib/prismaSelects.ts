/**
 * Standard user SELECT shape for API responses
 */
export const USER_SELECT = {
  id: true,
  name: true,
  avatarId: true,
  customAvatarUrl: true,
  avatar: true,
} as const;

/**
 * Standard tag INCLUDE shape for passenger tags
 */
export const PASSENGER_TAG_INCLUDE = {
  include: { groupTag: true },
} as const;

/**
 * Standard tag INCLUDE shape for car tags
 */
export const CAR_TAG_INCLUDE = {
  include: { groupTag: true },
} as const;

/**
 * Standard passenger INCLUDE shape with user and tags
 */
export const PASSENGER_INCLUDE = {
  include: {
    user: { select: USER_SELECT },
    tags: PASSENGER_TAG_INCLUDE,
  },
} as const;

/**
 * Standard car INCLUDE shape with driver, userCar, passengers, and tags
 */
export const CAR_INCLUDE = {
  include: {
    driver: { select: USER_SELECT },
    userCar: { include: { avatar: true } },
    passengers: {
      include: {
        user: { select: USER_SELECT },
        tags: PASSENGER_TAG_INCLUDE,
      },
    },
    tags: CAR_TAG_INCLUDE,
  },
} as const;

/**
 * Standard session INCLUDE shape with cars and passengers (with tags)
 */
export const SESSION_INCLUDE = {
  cars: CAR_INCLUDE,
  passengers: PASSENGER_INCLUDE,
} as const;
