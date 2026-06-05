export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Glutes', 'Core', 'Full Body', 'Cardio',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export const EXERCISE_SUGGESTIONS: Record<MuscleGroup, string[]> = {
  Chest: [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Dumbbell Flyes', 'Cable Crossover', 'Push-Ups', 'Chest Dips',
    'Pec Deck', 'Incline Dumbbell Press', 'Landmine Press',
  ],
  Back: [
    'Pull-Ups', 'Chin-Ups', 'Barbell Row', 'Dumbbell Row',
    'Lat Pulldown', 'Seated Cable Row', 'Deadlift', 'T-Bar Row',
    'Face Pulls', 'Straight-Arm Pulldown', 'Meadows Row',
  ],
  Shoulders: [
    'Overhead Press (Barbell)', 'Dumbbell Shoulder Press', 'Arnold Press',
    'Lateral Raises', 'Front Raises', 'Rear Delt Flyes',
    'Cable Lateral Raises', 'Upright Row', 'Shrugs',
  ],
  Biceps: [
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
    'Preacher Curl', 'Cable Curl', 'Incline Dumbbell Curl',
    'Concentration Curl', 'Spider Curl', 'Drag Curl',
  ],
  Triceps: [
    'Skull Crushers', 'Tricep Dips', 'Cable Pushdown (Rope)',
    'Cable Pushdown (Bar)', 'Overhead Tricep Extension',
    'Close-Grip Bench Press', 'Kickbacks', 'Diamond Push-Ups',
  ],
  Legs: [
    'Squat (Barbell)', 'Front Squat', 'Leg Press', 'Hack Squat',
    'Romanian Deadlift', 'Leg Curl', 'Leg Extension',
    'Lunges', 'Bulgarian Split Squat', 'Walking Lunges',
    'Calf Raises', 'Seated Calf Raises', 'Box Jumps',
  ],
  Glutes: [
    'Hip Thrust', 'Glute Bridge', 'Cable Kickback',
    'Romanian Deadlift', 'Sumo Squat', 'Step-Ups',
    'Donkey Kicks', 'Bulgarian Split Squat', 'Abductor Machine',
  ],
  Core: [
    'Plank', 'Side Plank', 'Crunches', 'Bicycle Crunches',
    'Russian Twists', 'Leg Raises', 'Hanging Knee Raises',
    'Ab Wheel Rollout', 'Cable Crunches', 'Dead Bug',
    'Pallof Press', 'Dragon Flag',
  ],
  'Full Body': [
    'Deadlift', 'Clean & Press', 'Thrusters', 'Burpees',
    'Turkish Get-Up', 'Farmer\'s Walk', 'Kettlebell Swing',
    'Power Clean', 'Man Maker',
  ],
  Cardio: [
    'Treadmill Run', 'Stationary Bike', 'Rowing Machine',
    'Jump Rope', 'Stairmaster', 'Elliptical',
    'HIIT Sprints', 'Swimming', 'Battle Ropes',
  ],
};
