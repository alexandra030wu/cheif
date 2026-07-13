-- Fat-loss mode: opt-in flag + daily nutrition targets on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fat_loss_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_protein_target_g INTEGER;
