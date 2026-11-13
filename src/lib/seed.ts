import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@coachfouad.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CoachFouad2026!";
const DEMO_CLIENT_EMAIL = "client@coachfouad.com";
const DEMO_CLIENT_PASSWORD = "ClientDemo2026!";

const id = () => randomUUID();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

type Row = Record<string, unknown>;

export function seedDatabase(db: Database.Database) {
  const existingUsers = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };

  const insertUser = db.prepare(
    "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertProfile = db.prepare(
    `INSERT INTO client_profiles (
       id, user_id, full_name, phone, goal, status, coach_notes, subscription_started_at, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  if (existingUsers.c === 0) {
    const adminId = id();
    const now = new Date().toISOString();
    insertUser.run(adminId, ADMIN_EMAIL, hash(ADMIN_PASSWORD), "admin", now);

    const clients: Array<{
      email: string;
      name: string;
      phone: string;
      goal: string;
      status: string;
      notes: string;
      daysAgo: number;
    }> = [
      {
        email: DEMO_CLIENT_EMAIL,
        name: "Omar Khaled",
        phone: "+20 100 111 2233",
        goal: "Lean out to 12% body fat while keeping strength",
        status: "active",
        notes:
          "Great adherence on training. Struggles with late-night snacking — keep dinner high in protein.",
        daysAgo: 26,
      },
      {
        email: "sara.mansour@example.com",
        name: "Sara Mansour",
        phone: "+20 122 555 9081",
        goal: "Build glutes and upper body tone",
        status: "pending",
        notes: "Waiting for onboarding questionnaire and baseline photos.",
        daysAgo: 2,
      },
      {
        email: "youssef.adel@example.com",
        name: "Youssef Adel",
        phone: "+20 111 777 3322",
        goal: "Firstpowerlifting meet prep",
        status: "active",
        notes: "Squat depth improving. Add 2.5kg weekly on top set.",
        daysAgo: 19,
      },
      {
        email: "nour.hassan@example.com",
        name: "Nour Hassan",
        phone: "+20 106 220 7788",
        goal: "Postpartum return to training",
        status: "suspended",
        notes: "On medical hold until clearance. Do not assign new plans.",
        daysAgo: 61,
      },
    ];

    for (const client of clients) {
      const userId = id();
      const createdAt = new Date(Date.now() - client.daysAgo * 86400000).toISOString();
      insertUser.run(userId, client.email, hash(DEMO_CLIENT_PASSWORD), "client", createdAt);
      insertProfile.run(
        id(),
        userId,
        client.name,
        client.phone,
        client.goal,
        client.status,
        client.notes,
        client.status === "active" ? createdAt : null,
        createdAt,
      );
    }
  }

  // Announcements
  const announcementCount = db.prepare("SELECT COUNT(*) as c FROM announcements").get() as {
    c: number;
  };
  if (announcementCount.c === 0) {
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as
      | { id: string }
      | undefined;
    const insertAnnouncement = db.prepare(
      "INSERT INTO announcements (id, title, body, is_active, created_by) VALUES (?, ?, ?, 1, ?)",
    );
    insertAnnouncement.run(
      id(),
      "New check-in schedule",
      "Weekly check-ins move to Friday mornings. Send your weight, waist measurement and 3 progress photos before 10:00 AM.",
      admin?.id ?? null,
    );
    insertAnnouncement.run(
      id(),
      "Training app is live",
      "Nutrition plans, workout programs and all coaching files now live in your dashboard. Download the nutrition PDF from the nutrition page.",
      admin?.id ?? null,
    );
  }

  // Plan templates
  const planCount = db.prepare(
    "SELECT COUNT(*) as c FROM nutrition_plans WHERE is_template = 1",
  ).get() as { c: number };

  if (planCount.c === 0) {
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as
      | { id: string }
      | undefined;
    const adminId = admin?.id ?? null;

    const insertPlan = db.prepare(
      `INSERT INTO nutrition_plans (id, title, description, calories, protein_g, carbs_g, fats_g, notes, is_template, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    const insertMeal = db.prepare(
      `INSERT INTO nutrition_meals (id, plan_id, meal_number, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertItem = db.prepare(
      "INSERT INTO meal_items (id, meal_id, food_name, quantity, sort_order) VALUES (?, ?, ?, ?, ?)",
    );

    const leanPlan = id();
    insertPlan.run(
      leanPlan,
      "Lean Shred — 2200 kcal",
      "Cutting phase built around high protein and moderate carbs. Designed for 5 training days per week.",
      2200,
      190,
      210,
      60,
      "Drink 3–4L of water daily. Keep the last meal 2 hours before bed. Weigh food raw.",
      adminId,
    );
    const leanMeals: Array<{ n: number; title: string; desc: string; items: [string, string][] }> = [
      {
        n: 1,
        title: "Breakfast",
        desc: "Fast, high-protein start",
        items: [
          ["Whole eggs", "3 large"],
          ["Egg whites", "150 g"],
          ["Oats", "60 g"],
          ["Blueberries", "80 g"],
        ],
      },
      {
        n: 2,
        title: "Mid-morning",
        desc: "Pre-workout fuel",
        items: [
          ["Greek yogurt 0%", "200 g"],
          ["Banana", "1 medium"],
          ["Almonds", "15 g"],
        ],
      },
      {
        n: 3,
        title: "Lunch",
        desc: "Main protein + carbs",
        items: [
          ["Grilled chicken breast", "200 g"],
          ["Basmati rice (cooked)", "180 g"],
          ["Mixed salad", "1 large bowl"],
          ["Olive oil", "1 tsp"],
        ],
      },
      {
        n: 4,
        title: "Post-workout",
        desc: "Fast digesting",
        items: [
          ["Whey protein", "1 scoop"],
          ["Rice cakes", "2"],
          ["Honey", "1 tsp"],
        ],
      },
      {
        n: 5,
        title: "Dinner",
        desc: "Light and protein heavy",
        items: [
          ["White fish or salmon", "200 g"],
          ["Sweet potato", "200 g"],
          ["Green vegetables", "200 g"],
        ],
      },
    ];
    leanMeals.forEach((meal, index) => {
      const mealId = id();
      insertMeal.run(mealId, leanPlan, meal.n, meal.title, meal.desc, index);
      meal.items.forEach(([food, qty], i) => insertItem.run(id(), mealId, food, qty, i));
    });

    const massPlan = id();
    insertPlan.run(
      massPlan,
      "Mass Gain — 3100 kcal",
      "Clean bulking template for intermediate lifters training 4 days per week.",
      3100,
      200,
      380,
      90,
      "Add 100g of carbs on leg days. Track weight weekly — target +0.3kg per week.",
      adminId,
    );
    const massMeals: Array<{ n: number; title: string; desc: string; items: [string, string][] }> = [
      {
        n: 1,
        title: "Breakfast",
        desc: "Calorie dense",
        items: [
          ["Whole eggs", "4"],
          ["Oats", "100 g"],
          ["Whole milk", "250 ml"],
          ["Peanut butter", "20 g"],
        ],
      },
      {
        n: 2,
        title: "Lunch",
        desc: "",
        items: [
          ["Beef mince 5%", "200 g"],
          ["Pasta (cooked)", "250 g"],
          ["Parmesan", "20 g"],
        ],
      },
      {
        n: 3,
        title: "Pre-workout",
        desc: "",
        items: [
          ["Rice", "200 g cooked"],
          ["Chicken thigh", "180 g"],
        ],
      },
      {
        n: 4,
        title: "Dinner",
        desc: "",
        items: [
          ["Salmon", "200 g"],
          ["Potatoes", "300 g"],
          ["Avocado", "1/2"],
        ],
      },
    ];
    massMeals.forEach((meal, index) => {
      const mealId = id();
      insertMeal.run(mealId, massPlan, meal.n, meal.title, meal.desc, index);
      meal.items.forEach(([food, qty], i) => insertItem.run(id(), mealId, food, qty, i));
    });

    // Workout templates
    const insertWorkout = db.prepare(
      `INSERT INTO workout_plans (id, title, description, split_type, notes, is_template, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    );
    const insertDay = db.prepare(
      `INSERT INTO workout_days (id, plan_id, day_number, title, focus, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertExercise = db.prepare(
      `INSERT INTO exercises (id, day_id, name, sets, reps, rest_seconds, instructions, coach_notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const ppl = id();
    insertWorkout.run(
      ppl,
      "Push Pull Legs — 5 Day",
      "High volume PPL split for intermediate lifters. 5 training days with a dedicated arm day.",
      "Push / Pull / Legs",
      "Progress by adding 2.5kg to the main lift each week. RPE 8 on working sets.",
      adminId,
    );
    const days: Array<{
      n: number;
      title: string;
      focus: string;
      notes: string;
      exercises: Array<[string, string, string, number, string, string]>;
    }> = [
      {
        n: 1,
        title: "Push A — Chest Focus",
        focus: "Chest, shoulders, triceps",
        notes: "Keep shoulder blades retracted on all pressing.",
        exercises: [
          ["Barbell Bench Press", "4", "6-8", 150, "Feet planted, slight arch, bar to mid-chest.", "Last set to failure."],
          ["Incline Dumbbell Press", "3", "8-10", 90, "30° incline, controlled eccentric.", ""],
          ["Cable Fly", "3", "12-15", 60, "Squeeze at the midline.", "Slow 3 second negative."],
          ["Seated Dumbbell Shoulder Press", "3", "8-10", 90, "Do not flare elbows past 45°.", ""],
          ["Overhead Triceps Extension", "3", "10-12", 60, "Elbows tucked, full stretch.", ""],
        ],
      },
      {
        n: 2,
        title: "Pull A — Back Width",
        focus: "Lats, biceps",
        notes: "Think elbows to hips on every pull.",
        exercises: [
          ["Weighted Pull Up", "4", "6-8", 150, "Full hang to chin over bar.", "Add weight if 8 reps is easy."],
          ["Chest Supported Row", "4", "8-10", 90, "Drive elbows back, pause 1s.", ""],
          ["Straight Arm Pulldown", "3", "12-15", 60, "Keep slight bend in elbows.", ""],
          ["Face Pull", "3", "15-20", 45, "Pull to forehead height.", "Shoulder health — never skip."],
          ["Incline Dumbbell Curl", "3", "10-12", 60, "Full supination at the top.", ""],
        ],
      },
      {
        n: 3,
        title: "Legs A — Quad Focus",
        focus: "Quads, glutes, calves",
        notes: "Warm up hips and knees for 8 minutes before starting.",
        exercises: [
          ["Back Squat", "5", "5", 180, "Brace hard, knees track over toes.", "Depth before load."],
          ["Leg Press", "4", "10-12", 120, "Feet shoulder width, no lower back rounding.", ""],
          ["Walking Lunge", "3", "10 each", 90, "Long steps, torso upright.", ""],
          ["Leg Extension", "3", "12-15", 60, "2s squeeze at top.", ""],
          ["Standing Calf Raise", "4", "15-20", 45, "Full stretch at the bottom.", ""],
        ],
      },
      {
        n: 4,
        title: "Upper Body — Hypertrophy",
        focus: "Full upper body",
        notes: "Pump-focused day, keep rest short.",
        exercises: [
          ["Incline Barbell Press", "4", "8-10", 120, "Bar to upper chest.", ""],
          ["Lat Pulldown", "4", "10-12", 90, "Lean back slightly, pull to sternum.", ""],
          ["Lateral Raise", "4", "12-15", 60, "Lead with elbows.", "Drop set on the final set."],
          ["Seated Cable Row", "3", "10-12", 90, "No torso swing.", ""],
          ["Cable Curl", "3", "12-15", 60, "", ""],
        ],
      },
      {
        n: 5,
        title: "Lower Body — Posterior",
        focus: "Hamstrings, glutes",
        notes: "Hinge pattern main lift today.",
        exercises: [
          ["Romanian Deadlift", "4", "8-10", 150, "Hips back, bar close to legs.", "Stop 1 rep before form breaks."],
          ["Hip Thrust", "4", "10-12", 120, "Pause 1s at lockout.", ""],
          ["Seated Leg Curl", "4", "12-15", 60, "Slow eccentric.", ""],
          ["Bulgarian Split Squat", "3", "8 each", 90, "Front foot flat, torso forward slightly.", ""],
          ["Hanging Leg Raise", "3", "12-15", 60, "No swinging.", ""],
        ],
      },
    ];
    for (const day of days) {
      const dayId = id();
      insertDay.run(dayId, ppl, day.n, day.title, day.focus, day.notes, day.n);
      day.exercises.forEach(([name, sets, reps, rest, instructions, coachNotes], i) =>
        insertExercise.run(id(), dayId, name, sets, reps, rest, instructions, coachNotes, i),
      );
    }

    const upperLower = id();
    insertWorkout.run(
      upperLower,
      "Upper / Lower — 4 Day",
      "Balanced 4-day split, ideal when time is limited. 45–60 minute sessions.",
      "Upper / Lower",
      "Two lower days, two upper days. Take a rest day between lower sessions.",
      adminId,
    );
    const ulDays: Array<{ n: number; title: string; focus: string; exercises: Array<[string, string, string, number]> }> = [
      {
        n: 1,
        title: "Upper A",
        focus: "Strength",
        exercises: [
          ["Bench Press", "4", "5", 180],
          ["Barbell Row", "4", "6-8", 150],
          ["Dumbbell Shoulder Press", "3", "8-10", 90],
          ["Lat Pulldown", "3", "10-12", 90],
        ],
      },
      {
        n: 2,
        title: "Lower A",
        focus: "Squat focus",
        exercises: [
          ["Back Squat", "4", "5", 180],
          ["Romanian Deadlift", "3", "8", 120],
          ["Leg Press", "3", "12", 90],
          ["Calf Raise", "4", "15", 45],
        ],
      },
      {
        n: 3,
        title: "Upper B",
        focus: "Hypertrophy",
        exercises: [
          ["Incline Dumbbell Press", "4", "10", 90],
          ["Seated Cable Row", "4", "10", 90],
          ["Lateral Raise", "3", "15", 60],
          ["Cable Curl", "3", "12", 60],
        ],
      },
      {
        n: 4,
        title: "Lower B",
        focus: "Deadlift focus",
        exercises: [
          ["Deadlift", "4", "4", 210],
          ["Hip Thrust", "3", "10", 120],
          ["Leg Extension", "3", "15", 60],
          ["Hanging Leg Raise", "3", "12", 60],
        ],
      },
    ];
    for (const day of ulDays) {
      const dayId = id();
      insertDay.run(dayId, upperLower, day.n, day.title, day.focus, null, day.n);
      day.exercises.forEach(([name, sets, reps, rest], i) =>
        insertExercise.run(id(), dayId, name, sets, reps, rest, null, null, i),
      );
    }

    // Assign copies of templates to the demo client
    const demo = db
      .prepare(
        `SELECT p.id, u.id as user_id FROM client_profiles p
         JOIN users u ON u.id = p.user_id WHERE u.email = ?`,
      )
      .get(DEMO_CLIENT_EMAIL) as { id: string; user_id: string } | undefined;

    if (demo) {
      assignCopy(db, demo.id, "nutrition", leanPlan, adminId);
      assignCopy(db, demo.id, "workout", ppl, adminId);

      const notif = db.prepare(
        `INSERT INTO notifications (id, user_id, title, body, type, link, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      notif.run(
        id(),
        demo.user_id,
        "Your nutrition plan is ready",
        "Lean Shred — 2200 kcal has been added to your account.",
        "nutrition",
        "/dashboard/nutrition",
        1,
        new Date(Date.now() - 3 * 86400000).toISOString(),
      );
      notif.run(
        id(),
        demo.user_id,
        "New training block assigned",
        "Push Pull Legs — 5 Day starts this week. Review day 1 before Monday.",
        "workout",
        "/dashboard/workouts",
        0,
        new Date(Date.now() - 86400000).toISOString(),
      );
      notif.run(
        id(),
        demo.user_id,
        "Weekly check-in due Friday",
        "Send weight, waist measurement and progress photos before 10:00 AM.",
        "announcement",
        "/dashboard",
        0,
        new Date(Date.now() - 4 * 3600000).toISOString(),
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  if (existingUsers.c === 0) {
    // eslint-disable-next-line no-console
    console.log(`[seed] demo client: ${DEMO_CLIENT_EMAIL} / ${DEMO_CLIENT_PASSWORD}`);
  }
}

/** Deep-copies a plan (with all nested rows) and assigns the copy to a client. */
export function assignCopy(
  db: Database.Database,
  clientId: string,
  kind: "nutrition" | "workout",
  sourcePlanId: string,
  adminId: string | null,
) {
  const copyId = id();
  if (kind === "nutrition") {
    const plan = db.prepare("SELECT * FROM nutrition_plans WHERE id = ?").get(sourcePlanId) as Row;
    if (!plan) throw new Error("Plan not found");
    db.prepare(
      `INSERT INTO nutrition_plans (id, title, description, calories, protein_g, carbs_g, fats_g, notes, is_template, source_plan_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      copyId,
      plan.title,
      plan.description,
      plan.calories,
      plan.protein_g,
      plan.carbs_g,
      plan.fats_g,
      plan.notes,
      sourcePlanId,
      adminId,
    );
    const meals = db
      .prepare("SELECT * FROM nutrition_meals WHERE plan_id = ? ORDER BY sort_order")
      .all(sourcePlanId) as Row[];
    for (const meal of meals) {
      const mealId = id();
      db.prepare(
        `INSERT INTO nutrition_meals (id, plan_id, meal_number, title, description, image_path, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        mealId,
        copyId,
        meal.meal_number,
        meal.title,
        meal.description,
        meal.image_path,
        meal.sort_order,
      );
      const items = db
        .prepare("SELECT * FROM meal_items WHERE meal_id = ? ORDER BY sort_order")
        .all(meal.id) as Row[];
      for (const item of items) {
        db.prepare(
          "INSERT INTO meal_items (id, meal_id, food_name, quantity, sort_order) VALUES (?, ?, ?, ?, ?)",
        ).run(id(), mealId, item.food_name, item.quantity, item.sort_order);
      }
    }
  } else {
    const plan = db.prepare("SELECT * FROM workout_plans WHERE id = ?").get(sourcePlanId) as Row;
    if (!plan) throw new Error("Plan not found");
    db.prepare(
      `INSERT INTO workout_plans (id, title, description, split_type, notes, is_template, source_plan_id, created_by)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      copyId,
      plan.title,
      plan.description,
      plan.split_type,
      plan.notes,
      sourcePlanId,
      adminId,
    );
    const days = db
      .prepare("SELECT * FROM workout_days WHERE plan_id = ? ORDER BY sort_order")
      .all(sourcePlanId) as Row[];
    for (const day of days) {
      const dayId = id();
      db.prepare(
        `INSERT INTO workout_days (id, plan_id, day_number, title, focus, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(dayId, copyId, day.day_number, day.title, day.focus, day.notes, day.sort_order);
      const exercises = db
        .prepare("SELECT * FROM exercises WHERE day_id = ? ORDER BY sort_order")
        .all(day.id) as Row[];
      for (const ex of exercises) {
        db.prepare(
          `INSERT INTO exercises (
             id, day_id, name, sets, reps, rest_seconds, video_url, video_stored_name,
             video_original_name, video_mime_type, video_size_bytes, image_path,
             instructions, coach_notes, sort_order
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id(),
          dayId,
          ex.name,
          ex.sets,
          ex.reps,
          ex.rest_seconds,
          ex.video_url,
          ex.video_stored_name ?? null,
          ex.video_original_name ?? null,
          ex.video_mime_type ?? null,
          ex.video_size_bytes ?? null,
          ex.image_path,
          ex.instructions,
          ex.coach_notes,
          ex.sort_order,
        );
      }
    }
  }

  db.prepare("UPDATE assignments SET is_active = 0 WHERE client_id = ? AND kind = ?").run(
    clientId,
    kind,
  );
  db.prepare(
    "INSERT INTO assignments (id, client_id, kind, plan_id, is_active) VALUES (?, ?, ?, ?, 1)",
  ).run(id(), clientId, kind, copyId);

  return copyId;
}
