-- Cleanup duplicate family memberships for invited users
-- Issue: Users who were invited but signed up got 2 families:
--   1. Family they were invited to
--   2. New family created by handle_new_user
-- Solution: Remove the auto-created family, keep the invited family

DO $$
DECLARE
  duplicate_user RECORD;
  family_to_keep uuid;
  family_to_remove uuid;
  member_count integer;
BEGIN
  -- Find users with multiple family memberships
  FOR duplicate_user IN 
    SELECT user_id, COUNT(*) as family_count
    FROM family_members
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE LOG 'Found user % with % families', duplicate_user.user_id, duplicate_user.family_count;
    
    -- Find the family to keep (the one they were invited to)
    -- This is the family where they are NOT the creator
    SELECT fm.family_id INTO family_to_keep
    FROM family_members fm
    JOIN family_groups fg ON fm.family_id = fg.id
    WHERE fm.user_id = duplicate_user.user_id
      AND fg.created_by != duplicate_user.user_id
    LIMIT 1;
    
    -- If no invited family found, keep the oldest one
    IF family_to_keep IS NULL THEN
      SELECT fm.family_id INTO family_to_keep
      FROM family_members fm
      WHERE fm.user_id = duplicate_user.user_id
      ORDER BY fm.joined_at ASC
      LIMIT 1;
    END IF;
    
    RAISE LOG 'Keeping family % for user %', family_to_keep, duplicate_user.user_id;
    
    -- Remove user from other families
    FOR family_to_remove IN
      SELECT family_id
      FROM family_members
      WHERE user_id = duplicate_user.user_id
        AND family_id != family_to_keep
    LOOP
      RAISE LOG 'Removing user % from family %', duplicate_user.user_id, family_to_remove;
      
      -- Delete the family_members entry
      DELETE FROM family_members
      WHERE user_id = duplicate_user.user_id
        AND family_id = family_to_remove;
      
      -- Check if this family has any other members
      SELECT COUNT(*) INTO member_count
      FROM family_members
      WHERE family_id = family_to_remove;
      
      -- If family is now empty, delete it and related data
      IF member_count = 0 THEN
        RAISE LOG 'Family % is now empty, deleting it', family_to_remove;
        
        -- Delete subscription (will cascade)
        DELETE FROM subscriptions WHERE family_id = family_to_remove;
        
        -- Delete family group (will cascade to other tables via FK)
        DELETE FROM family_groups WHERE id = family_to_remove;
        
        RAISE LOG 'Deleted empty family %', family_to_remove;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE LOG 'Cleanup complete';
END $$;

-- Verify cleanup
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id
    FROM family_members
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still have % users with multiple families', duplicate_count;
  ELSE
    RAISE LOG 'All users now have exactly one family';
  END IF;
END $$;
